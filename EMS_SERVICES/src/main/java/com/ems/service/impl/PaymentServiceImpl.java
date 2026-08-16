package com.ems.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.dto.request.PaymentInitiationRequest;
import com.ems.dto.request.PaymentRefundRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.dto.response.PaymentResponse;
import com.ems.entity.CertificationApplication;
import com.ems.entity.Payment;
import com.ems.entity.User;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.PaymentProvider;
import com.ems.enums.PaymentStatus;
import com.ems.exception.BusinessException;
import com.ems.exception.ResourceNotFoundException;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.PaymentRepository;
import com.ems.repository.UserRepository;
import com.ems.service.PaymentReceiptContent;
import com.ems.service.PaymentReceiptPdfGeneratorService;
import com.ems.service.PaymentReceiptPdfGeneratorService.PaymentReceiptData;
import com.ems.service.PaymentService;
import com.ems.service.payment.PaymentProviderResult;
import com.ems.service.payment.PaymentProviderStrategy;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional
public class PaymentServiceImpl implements PaymentService {

	private static final BigDecimal L1_FEE = BigDecimal.valueOf(999);
	private static final BigDecimal L2_FEE = BigDecimal.valueOf(1999);
	private static final BigDecimal L3_FEE = BigDecimal.valueOf(2499);

	private final PaymentRepository paymentRepository;
	private final CertificationApplicationRepository certificationApplicationRepository;
	private final UserRepository userRepository;
	private final PaymentReceiptPdfGeneratorService receiptPdfGeneratorService;
	private final Map<PaymentProvider, PaymentProviderStrategy> providerStrategies;

	public PaymentServiceImpl(
			PaymentRepository paymentRepository,
			CertificationApplicationRepository certificationApplicationRepository,
			UserRepository userRepository,
			PaymentReceiptPdfGeneratorService receiptPdfGeneratorService,
			List<PaymentProviderStrategy> providerStrategies) {
		this.paymentRepository = paymentRepository;
		this.certificationApplicationRepository = certificationApplicationRepository;
		this.userRepository = userRepository;
		this.receiptPdfGeneratorService = receiptPdfGeneratorService;
		this.providerStrategies = providerStrategies.stream()
				.collect(Collectors.toMap(PaymentProviderStrategy::provider, Function.identity()));
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public PaymentResponse initiatePayment(String email, Long applicationId, PaymentInitiationRequest request) {
		CertificationApplication application = findApplication(email, applicationId);
		if (application.getExam() == null) {
			throw new BusinessException("Application is not linked to an exam", HttpStatus.BAD_REQUEST);
		}
		if (application.getPaymentStatus() == PaymentStatus.SUCCESS) {
			boolean hasSuccessfulPaymentRecord = paymentRepository
					.existsByCertificationApplicationIdAndPaymentStatus(application.getId(), PaymentStatus.SUCCESS);

			if (!hasSuccessfulPaymentRecord && application.getApplicationStatus() == CertificationApplicationStatus.APPLIED) {
				log.warn("Repairing stale payment status for applicationId={} (status APPLIED but no successful payment rows)",
						application.getId());
				application.setPaymentStatus(PaymentStatus.PENDING);
				certificationApplicationRepository.save(application);
			} else {
				throw new BusinessException("Payment is already completed for this application", HttpStatus.CONFLICT);
			}
		}

		PaymentProvider provider = parseProvider(request.provider());
		Payment payment = Payment.builder()
				.transactionId(UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT))
				.user(application.getUser())
				.exam(application.getExam())
				.certificationApplication(application)
				.amount(resolveAmountByLevel(application.getCertificationLevel()))
				.currency(request.currency().trim().toUpperCase(Locale.ROOT))
				.provider(provider.name())
				.paymentStatus(PaymentStatus.PENDING)
				.build();

		Payment savedPayment = paymentRepository.save(payment);
		PaymentProviderResult initiation = strategy(provider).initiate(savedPayment);
		savedPayment.setProviderReference(initiation.providerReference());
		savedPayment.setPaymentStatus(initiation.paymentStatus());
		Payment persistedPayment = paymentRepository.save(savedPayment);

		application.setPaymentStatus(persistedPayment.getPaymentStatus());
		certificationApplicationRepository.save(application);

		log.info("Payment initiated: transactionId={}, provider={}, applicationId={}",
				persistedPayment.getTransactionId(), provider, applicationId);
		return toResponse(persistedPayment, initiation.redirectUrl(), initiation.qrCodePayload());
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public PaymentResponse verifyPayment(String email, String transactionId, PaymentVerificationRequest request) {
		User user = findUser(email);
		Payment payment = paymentRepository.findByTransactionIdAndUser(transactionId, user)
				.orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

		PaymentProvider provider = parseProvider(payment.getProvider());
		PaymentProviderResult verification = strategy(provider).verify(payment, request);
		payment.setPaymentStatus(verification.paymentStatus());
		payment.setProviderReference(verification.providerReference());
		payment.setPaymentDate(Instant.now());
		Payment savedPayment = paymentRepository.save(payment);

		CertificationApplication application = payment.getCertificationApplication();
		if (application != null) {
			application.setPaymentStatus(savedPayment.getPaymentStatus());
			if (savedPayment.getPaymentStatus() == PaymentStatus.SUCCESS) {
				application.setApplicationStatus(CertificationApplicationStatus.IN_PROGRESS);
			}
			certificationApplicationRepository.save(application);
		}

		return toResponse(savedPayment, verification.redirectUrl(), verification.qrCodePayload());
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public PaymentResponse refundPayment(String transactionId, PaymentRefundRequest request) {
		Payment payment = paymentRepository.findByTransactionId(transactionId)
				.orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

		if (payment.getPaymentStatus() != PaymentStatus.SUCCESS) {
			throw new BusinessException("Only successful payments can be refunded", HttpStatus.BAD_REQUEST);
		}

		PaymentProvider provider = parseProvider(payment.getProvider());
		PaymentProviderResult refund = strategy(provider).refund(payment, request);
		payment.setPaymentStatus(refund.paymentStatus());
		payment.setProviderReference(refund.providerReference());
		Payment savedPayment = paymentRepository.save(payment);

		CertificationApplication application = payment.getCertificationApplication();
		if (application != null) {
			application.setPaymentStatus(PaymentStatus.REFUNDED);
			certificationApplicationRepository.save(application);
		}

		return toResponse(savedPayment, refund.redirectUrl(), refund.qrCodePayload());
	}

	@Override
	@Transactional(readOnly = true)
	public List<PaymentResponse> getPaymentHistory(String email) {
		User user = findUser(email);
		return paymentRepository.findByUserOrderByCreatedDateDesc(user).stream()
				.map(payment -> toResponse(payment, null, null))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public PaymentReceiptContent downloadReceipt(String email, String transactionId) {
		User user = findUser(email);
		Payment payment = paymentRepository.findByTransactionIdAndUser(transactionId, user)
				.orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

		// A pending payment has not settled, so there is nothing to receipt yet.
		if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
			throw new BusinessException("Receipt is available once the payment has been processed",
					HttpStatus.CONFLICT);
		}

		byte[] pdf = receiptPdfGeneratorService.generateReceiptPdf(new PaymentReceiptData(
				payment.getTransactionId(),
				(user.getFirstName() + " " + user.getLastName()).trim(),
				user.getUserId(),
				user.getEmail(),
				describe(payment),
				payment.getAmount(),
				payment.getCurrency(),
				payment.getProvider(),
				payment.getProviderReference(),
				payment.getPaymentStatus(),
				payment.getPaymentDate()));

		return new PaymentReceiptContent(
				new ByteArrayResource(pdf),
				MediaType.APPLICATION_PDF_VALUE,
				"receipt-" + payment.getTransactionId() + ".pdf");
	}

	private PaymentProviderStrategy strategy(PaymentProvider provider) {
		PaymentProviderStrategy strategy = providerStrategies.get(provider);
		if (strategy == null) {
			throw new BusinessException("Unsupported payment provider: " + provider, HttpStatus.BAD_REQUEST);
		}
		return strategy;
	}

	private PaymentProvider parseProvider(String rawProvider) {
		if (rawProvider == null || rawProvider.isBlank()) {
			throw new BusinessException("Unsupported payment provider: " + rawProvider, HttpStatus.BAD_REQUEST);
		}

		String normalized = rawProvider.trim().toUpperCase(Locale.ROOT)
				.replace('-', '_')
				.replace(' ', '_');
		if ("UPI".equals(normalized)) {
			return PaymentProvider.UPI_QR;
		}

		try {
			return PaymentProvider.valueOf(normalized);
		} catch (IllegalArgumentException ex) {
			throw new BusinessException("Unsupported payment provider: " + rawProvider, HttpStatus.BAD_REQUEST);
		}
	}

	private BigDecimal resolveAmountByLevel(CertificationLevel level) {
		return switch (level) {
			case L1 -> L1_FEE;
			case L2 -> L2_FEE;
			case L3 -> L3_FEE;
		};
	}

	private User findUser(String email) {
		return userRepository.findByEmailIgnoreCase(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
	}

	private CertificationApplication findApplication(String email, Long applicationId) {
		User user = findUser(email);
		return certificationApplicationRepository.findByIdAndUser(applicationId, user)
				.orElseThrow(() -> new ResourceNotFoundException("Exam application not found"));
	}

	/**
	 * The line-item wording for a payment.
	 *
	 * <p>Built from the persisted application and exam rather than stored per
	 * row, so historical payments re-read with today's phrasing and no caller
	 * can influence what a receipt claims was purchased.
	 */
	private String describe(Payment payment) {
		CertificationApplication application = payment.getCertificationApplication();
		CertificationLevel level = application != null
				? application.getCertificationLevel()
				: payment.getExam().getCertificationLevel();

		String subject = level == null
				? payment.getExam().getExamName()
				: "Level " + level.name().substring(1) + " certification";

		return application == null
				? subject + " exam fee"
				: subject + " exam application fee";
	}

	private PaymentResponse toResponse(Payment payment, String redirectUrl, String qrCodePayload) {
		return new PaymentResponse(
				payment.getId(),
				payment.getTransactionId(),
				payment.getCertificationApplication() == null ? null : payment.getCertificationApplication().getId(),
				payment.getExam().getId(),
				describe(payment),
				payment.getAmount(),
				payment.getCurrency(),
				payment.getProvider(),
				payment.getPaymentStatus(),
				payment.getPaymentDate(),
				payment.getProviderReference(),
				redirectUrl,
				qrCodePayload);
	}
}
