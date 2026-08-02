package com.ems.service.impl;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.dto.request.ExamStartRequest;
import com.ems.dto.request.ExamWorkflowApplicationRequest;
import com.ems.dto.request.PaymentCompletionRequest;
import com.ems.dto.request.PaymentInitiationRequest;
import com.ems.dto.request.PaymentVerificationRequest;
import com.ems.dto.request.WorkflowExamScheduleRequest;
import com.ems.dto.response.CertificationEligibilityResponse;
import com.ems.dto.response.ExamQuestionPayloadResponse;
import com.ems.dto.response.ExamSessionQuestionResponse;
import com.ems.dto.response.ExamStartResponse;
import com.ems.dto.response.ExamWorkflowApplicationResponse;
import com.ems.dto.response.PaymentResponse;
import com.ems.dto.response.WorkflowExamOptionResponse;
import com.ems.entity.Certification;
import com.ems.entity.CertificationApplication;
import com.ems.entity.Exam;
import com.ems.entity.ExamSession;
import com.ems.entity.Question;
import com.ems.entity.User;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.CertificationStatus;
import com.ems.enums.ExamStatus;
import com.ems.enums.PaymentStatus;
import com.ems.enums.QuestionSeverity;
import com.ems.enums.QuestionType;
import com.ems.exception.BusinessException;
import com.ems.exception.ResourceNotFoundException;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.CertificationRepository;
import com.ems.repository.ExamRepository;
import com.ems.repository.ExamSessionRepository;
import com.ems.repository.QuestionRepository;
import com.ems.repository.UserRepository;
import com.ems.service.CertificationJourneyService;
import com.ems.service.ExamWorkflowService;
import com.ems.service.PaymentService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional
public class ExamWorkflowServiceImpl implements ExamWorkflowService {

	private static final int TOTAL_QUESTIONS = 30;
	private static final int COUNT_LOW = 6;
	private static final int COUNT_MEDIUM = 12;
	private static final int COUNT_HIGH = 12;
	private static final String VIOLATION_RESTART_MARKER = "3 proctoring violations";
	private static final String VIOLATION_RESTART_MESSAGE = "Exam was terminated after 3 violations. Re-apply and complete payment to restart from question 1.";

	private static final TypeReference<List<Long>> LONG_LIST_TYPE = new TypeReference<>() {
	};

	private final CertificationJourneyService certificationJourneyService;
	private final CertificationApplicationRepository certificationApplicationRepository;
	private final CertificationRepository certificationRepository;
	private final UserRepository userRepository;
	private final ExamRepository examRepository;
	private final QuestionRepository questionRepository;
	private final ExamSessionRepository examSessionRepository;
	private final PaymentService paymentService;
	private final ObjectMapper objectMapper;

	@Override
	@Transactional(readOnly = true)
	public WorkflowExamOptionResponse getWorkflowOptions(String email, CertificationLevel certificationLevel) {
		User user = findUser(email);
		CertificationEligibilityResponse eligibility = certificationJourneyService.getEligibility(email, certificationLevel);

		List<Certification> activeCertifications = certificationRepository
				.findByUserAndCertificationStatusOrderByIssueDateDesc(user, CertificationStatus.ACTIVE);

		List<WorkflowExamOptionResponse.CertificationInfo> certInfos = activeCertifications.stream()
				.map(cert -> new WorkflowExamOptionResponse.CertificationInfo(
						cert.getCertificationLevel(),
						cert.getCertificationStatus().toString(),
						cert.getIssueDate(),
						cert.getExpiryDate()))
				.toList();

		WorkflowExamOptionResponse.UserWorkflowInfo userInfo = new WorkflowExamOptionResponse.UserWorkflowInfo(
				user.getUserId(),
				user.getEmail(),
				user.getFirstName() + " " + user.getLastName(),
				user.getCurrentSkillLevel(),
				certInfos);

		if (!eligibility.eligible()) {
			return new WorkflowExamOptionResponse(userInfo, eligibility, List.of());
		}

		List<WorkflowExamOptionResponse.WorkflowExamOption> availableExams = examRepository
				.search(null, null, certificationLevel, ExamStatus.SCHEDULED, true).stream()
				.map(exam -> new WorkflowExamOptionResponse.WorkflowExamOption(
						exam.getId(),
						exam.getExamCode(),
						exam.getExamName(),
						exam.getCertificationLevel(),
						exam.getDurationMinutes(),
						exam.getTotalMarks(),
						exam.getPassingPercentage(),
						exam.getScheduledStartTime(),
						exam.getScheduledEndTime()))
				.toList();

		return new WorkflowExamOptionResponse(userInfo, eligibility, availableExams);
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public ExamWorkflowApplicationResponse createApplication(String email, ExamWorkflowApplicationRequest request) {
		User user = findUser(email);
		CertificationEligibilityResponse eligibility = certificationJourneyService
				.getEligibility(email, request.certificationLevel());
		if (!eligibility.eligible()) {
			throw new BusinessException(eligibility.message(), HttpStatus.BAD_REQUEST);
		}

		Exam exam = examRepository.findById(request.examId())
				.orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

		if (!exam.isPublished()) {
			throw new BusinessException("Selected exam is not published", HttpStatus.BAD_REQUEST);
		}
		if (exam.getCertificationLevel() != request.certificationLevel()) {
			throw new BusinessException(
					"Selected exam does not match requested certification level",
					HttpStatus.BAD_REQUEST);
		}

		CertificationApplication application = CertificationApplication.builder()
				.user(user)
				.exam(exam)
				.certificationLevel(request.certificationLevel())
				.applicationStatus(CertificationApplicationStatus.APPLIED)
				.paymentStatus(PaymentStatus.PENDING)
				.appliedOn(LocalDate.now())
				.remarks(request.remarks())
				.build();

		CertificationApplication saved = certificationApplicationRepository.save(application);
		return toWorkflowApplicationResponse(saved);
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public PaymentResponse initiatePayment(String email, Long applicationId, PaymentInitiationRequest request) {
		return paymentService.initiatePayment(email, applicationId, request);
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public PaymentResponse completePayment(String email, Long applicationId, PaymentCompletionRequest request) {
		findApplication(email, applicationId);

		PaymentResponse latestPayment = paymentService.getPaymentHistory(email).stream()
				.filter(payment -> payment.applicationId() != null && payment.applicationId().equals(applicationId))
				.findFirst()
				.orElseThrow(() -> new ResourceNotFoundException("Payment not found for application"));

		return paymentService.verifyPayment(
				email,
				latestPayment.transactionId(),
				new PaymentVerificationRequest(request.success(), request.providerReference()));
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public ExamWorkflowApplicationResponse scheduleExam(String email, Long applicationId,
			WorkflowExamScheduleRequest request) {
		CertificationApplication application = findApplication(email, applicationId);
		if (application.getPaymentStatus() != PaymentStatus.SUCCESS) {
			throw new BusinessException("Payment must be completed before scheduling the examination",
					HttpStatus.BAD_REQUEST);
		}

		if (application.getExam() == null) {
			throw new BusinessException("Application is not linked to an exam", HttpStatus.BAD_REQUEST);
		}

		Exam exam = application.getExam();
		if (exam.getScheduledStartTime() != null && request.scheduledExamTime().isBefore(exam.getScheduledStartTime())) {
			throw new BusinessException("Scheduled exam time cannot be earlier than the exam window start",
					HttpStatus.BAD_REQUEST);
		}
		if (exam.getScheduledEndTime() != null && request.scheduledExamTime().isAfter(exam.getScheduledEndTime())) {
			throw new BusinessException("Scheduled exam time cannot be later than the exam window end",
					HttpStatus.BAD_REQUEST);
		}

		application.setScheduledExamTime(request.scheduledExamTime());
		CertificationApplication saved = certificationApplicationRepository.save(application);
		return toWorkflowApplicationResponse(saved);
	}

	@Override
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public ExamStartResponse startExam(String email, Long applicationId, ExamStartRequest request) {
		CertificationApplication application = findApplication(email, applicationId);

		String readinessIssue = evaluateStartReadinessIssue(application);
		if (readinessIssue != null) {
			throw new BusinessException(readinessIssue, HttpStatus.BAD_REQUEST);
		}

		ExamSession existingSession = examSessionRepository
				.findTopByUserAndExamOrderBySessionStartTimeDescIdDesc(application.getUser(), application.getExam())
				.orElse(null);
		if (existingSession != null && existingSession.getSessionStatus() == ExamStatus.IN_PROGRESS) {
			List<Long> selectedIds = readLongList(existingSession.getSelectedQuestionIdsJson());
			if (selectedIds.isEmpty()) {
				throw new BusinessException("Active exam session has no selected questions", HttpStatus.INTERNAL_SERVER_ERROR);
			}

			Question firstQuestion = questionRepository.findById(selectedIds.get(0))
					.orElseThrow(() -> new ResourceNotFoundException("Question not found in existing exam session"));

			log.info("Exam resume applicationId={} sessionToken={} questionCount={}",
					applicationId, existingSession.getSessionToken(), selectedIds.size());

			return new ExamStartResponse(
					application.getId(),
					application.getExam().getId(),
					application.getExam().getExamCode(),
					application.getCertificationLevel(),
					existingSession.getSessionToken(),
					existingSession.getId(),
					existingSession.getSessionStartTime(),
					selectedIds.size(),
					selectedIds,
					toQuestionPayload(firstQuestion));
		}

		List<Question> selectedQuestions = buildProportionalQuestionSet(application.getCertificationLevel());
		Collections.shuffle(selectedQuestions);

		List<Long> selectedIds = selectedQuestions.stream().map(Question::getId).toList();
		ExamSession session = ExamSession.builder()
				.sessionToken(UUID.randomUUID())
				.user(application.getUser())
				.exam(application.getExam())
				.sessionStartTime(Instant.now())
				.sessionStatus(ExamStatus.IN_PROGRESS)
				.violationCount(0)
				.selectedQuestionIdsJson(writeLongList(selectedIds))
				.build();

		ExamSession savedSession = examSessionRepository.save(session);
		ExamQuestionPayloadResponse firstQuestion = toQuestionPayload(selectedQuestions.get(0));

		log.info("Exam started applicationId={} sessionToken={} questionCount={}",
				applicationId, savedSession.getSessionToken(), TOTAL_QUESTIONS);

		return new ExamStartResponse(
				application.getId(),
				application.getExam().getId(),
				application.getExam().getExamCode(),
				application.getCertificationLevel(),
				savedSession.getSessionToken(),
				savedSession.getId(),
				savedSession.getSessionStartTime(),
				TOTAL_QUESTIONS,
				selectedIds,
				firstQuestion);
	}

	@Override
	@Transactional(readOnly = true)
	public ExamSessionQuestionResponse getSessionQuestion(String email, UUID sessionToken, int questionNumber) {
		ExamSession session = examSessionRepository.findBySessionTokenAndUserEmailIgnoreCase(sessionToken, email)
				.orElseThrow(() -> new ResourceNotFoundException("Active exam session not found"));

		if (session.getSessionStatus() != ExamStatus.IN_PROGRESS) {
			throw new BusinessException("Exam session is no longer active", HttpStatus.BAD_REQUEST);
		}

		List<Long> questionIds = readLongList(session.getSelectedQuestionIdsJson());
		int totalQuestions = questionIds.size();
		if (questionNumber < 1 || questionNumber > totalQuestions) {
			throw new BusinessException(
					String.format("Question number must be between 1 and %d", totalQuestions),
					HttpStatus.BAD_REQUEST);
		}

		Long questionId = questionIds.get(questionNumber - 1);
		Question question = questionRepository.findById(questionId)
				.orElseThrow(() -> new ResourceNotFoundException("Question not found in session"));

		return new ExamSessionQuestionResponse(
				sessionToken,
				questionNumber,
				totalQuestions,
				toQuestionPayload(question));
	}

	@Override
	@Transactional
	@CacheEvict(cacheNames = "dashboard", allEntries = true)
	public ExamWorkflowApplicationResponse reApply(String email, Long failedApplicationId) {
		User user = findUser(email);

		CertificationApplication failedApplication = certificationApplicationRepository
				.findByIdAndUserWithExam(failedApplicationId, user)
				.orElseThrow(() -> new ResourceNotFoundException("Exam application not found"));

		CertificationApplicationStatus currentStatus = failedApplication.getApplicationStatus();
		if (currentStatus != CertificationApplicationStatus.FAILED
				&& currentStatus != CertificationApplicationStatus.EXPIRED
				&& currentStatus != CertificationApplicationStatus.REJECTED) {
			throw new BusinessException(
					"Re-application is only allowed for FAILED, EXPIRED or REJECTED applications. Current status: "
							+ currentStatus,
					HttpStatus.BAD_REQUEST);
		}

		CertificationEligibilityResponse eligibility = certificationJourneyService
				.getEligibility(email, failedApplication.getCertificationLevel());
		if (!eligibility.eligible()) {
			throw new BusinessException(eligibility.message(), HttpStatus.BAD_REQUEST);
		}

		boolean hasOpen = certificationApplicationRepository
				.existsByUserAndCertificationLevelAndApplicationStatusIn(
						failedApplication.getUser(),
						failedApplication.getCertificationLevel(),
						Set.of(
								CertificationApplicationStatus.APPLIED,
								CertificationApplicationStatus.ELIGIBLE,
								CertificationApplicationStatus.IN_PROGRESS));

		if (hasOpen) {
			throw new BusinessException(
					"An application is already in progress for " + failedApplication.getCertificationLevel(),
					HttpStatus.CONFLICT);
		}

		Exam exam = failedApplication.getExam();
		if (exam == null || !exam.isPublished() || exam.getExamStatus() != ExamStatus.SCHEDULED) {
			exam = null;
		}

		CertificationApplication newApplication = CertificationApplication.builder()
				.user(user)
				.exam(exam)
				.certificationLevel(failedApplication.getCertificationLevel())
				.applicationStatus(CertificationApplicationStatus.APPLIED)
				.paymentStatus(PaymentStatus.PENDING)
				.appliedOn(LocalDate.now())
				.remarks("Re-application after " + currentStatus + " on application #" + failedApplicationId)
				.build();

		CertificationApplication saved = certificationApplicationRepository.save(newApplication);

		ExamWorkflowApplicationResponse response = new ExamWorkflowApplicationResponse(
				saved.getId(),
				user.getUserId(),
				exam == null ? null : exam.getId(),
				exam == null ? null : exam.getExamCode(),
				saved.getCertificationLevel(),
				saved.getApplicationStatus(),
				saved.getPaymentStatus(),
				saved.getAppliedOn(),
				saved.getScheduledExamTime(),
				saved.getRemarks(),
				false,
				isViolationRestartRequired(saved),
				resolveRestartMessage(saved));

		log.info("re-apply userId={} level={} sourceApplicationId={} newApplicationId={}",
				email,
				failedApplication.getCertificationLevel(),
				failedApplicationId,
				saved.getId());

		return response;
	}

	@Override
	@Transactional(readOnly = true)
	public List<ExamWorkflowApplicationResponse> getReApplyableApplications(String email) {
		User user = findUser(email);
		return certificationApplicationRepository.findFailedApplicationsForReApply(user).stream()
				.map(app -> toWorkflowApplicationResponse(app, true))
				.toList();
	}

	private ExamWorkflowApplicationResponse toWorkflowApplicationResponse(CertificationApplication application) {
		return toWorkflowApplicationResponse(application, false);
	}

	private ExamWorkflowApplicationResponse toWorkflowApplicationResponse(CertificationApplication application,
			boolean canReApply) {
		return new ExamWorkflowApplicationResponse(
				application.getId(),
				application.getUser().getUserId(),
				application.getExam() == null ? null : application.getExam().getId(),
				application.getExam() == null ? null : application.getExam().getExamCode(),
				application.getCertificationLevel(),
				application.getApplicationStatus(),
				application.getPaymentStatus(),
				application.getAppliedOn(),
				application.getScheduledExamTime(),
				application.getRemarks(),
				canReApply,
				isViolationRestartRequired(application),
				resolveRestartMessage(application));
	}

	private boolean isViolationRestartRequired(CertificationApplication application) {
		return application.getApplicationStatus() == CertificationApplicationStatus.FAILED
				&& application.getRemarks() != null
				&& application.getRemarks().contains(VIOLATION_RESTART_MARKER);
	}

	private String resolveRestartMessage(CertificationApplication application) {
		return isViolationRestartRequired(application) ? VIOLATION_RESTART_MESSAGE : null;
	}

	private ExamQuestionPayloadResponse toQuestionPayload(Question question) {
		return new ExamQuestionPayloadResponse(
				question.getId(),
				question.getQuestionCode(),
				question.getQuestionText(),
				parseQuestionType(question.getQuestionType()),
				question.getSeverity(),
				readStringList(question.getOptionsJson()));
	}

	private QuestionType parseQuestionType(String questionType) {
		return switch (questionType) {
			case "Single Choice", "SINGLE_CHOICE" -> QuestionType.SINGLE_CHOICE;
			case "Multiple Choice", "MULTIPLE_CHOICE" -> QuestionType.MULTIPLE_CHOICE;
			default -> throw new BusinessException("Unsupported question type: " + questionType,
					HttpStatus.INTERNAL_SERVER_ERROR);
		};
	}

	private List<String> readStringList(String rawJson) {
		try {
			return objectMapper.readValue(rawJson, new TypeReference<List<String>>() {
			});
		} catch (JsonProcessingException ex) {
			throw new BusinessException("Failed to load question payload", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private List<Long> readLongList(String rawJson) {
		try {
			return objectMapper.readValue(rawJson, LONG_LIST_TYPE);
		} catch (JsonProcessingException ex) {
			throw new BusinessException("Failed to read session question list", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private String writeLongList(List<Long> values) {
		try {
			return objectMapper.writeValueAsString(values);
		} catch (JsonProcessingException ex) {
			throw new BusinessException("Failed to initialize exam session questions", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private List<Question> buildProportionalQuestionSet(CertificationLevel level) {
		List<Question> low = pickSeverity(level, QuestionSeverity.LOW, COUNT_LOW);
		List<Question> medium = pickSeverity(level, QuestionSeverity.MEDIUM, COUNT_MEDIUM);
		List<Question> high = pickSeverity(level, QuestionSeverity.HIGH, COUNT_HIGH);

		List<Question> combined = new ArrayList<>(TOTAL_QUESTIONS);
		combined.addAll(low);
		combined.addAll(medium);
		combined.addAll(high);
		return combined;
	}

	private List<Question> pickSeverity(CertificationLevel level, QuestionSeverity severity, int count) {
		List<Question> pool = new ArrayList<>(
				questionRepository.findByCertificationLevelAndSeverityInAndActiveTrue(level, List.of(severity)));
		if (pool.size() < count) {
			throw new BusinessException(
					String.format("Not enough %s severity questions for level %s: required %d, found %d",
							severity, level, count, pool.size()),
					HttpStatus.BAD_REQUEST);
		}
		Collections.shuffle(pool);
		return new ArrayList<>(pool.subList(0, count));
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

	private String evaluateStartReadinessIssue(CertificationApplication application) {
		if (application.getApplicationStatus() == CertificationApplicationStatus.FAILED) {
			return "This application is closed after a failed/invalidated attempt. Re-apply and complete payment before starting again.";
		}
		if (application.getPaymentStatus() != PaymentStatus.SUCCESS) {
			return "Payment must be completed before starting the examination";
		}
		if (application.getScheduledExamTime() == null) {
			return "Examination must be scheduled before it can be started";
		}
		if (application.getExam() == null) {
			return "Application is not linked to an exam";
		}
		return null;
	}
}
