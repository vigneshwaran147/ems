package com.ems.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ems.dto.request.ExamStartRequest;
import com.ems.entity.CertificationApplication;
import com.ems.entity.Exam;
import com.ems.entity.User;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.PaymentStatus;
import com.ems.exception.BusinessException;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.CertificationRepository;
import com.ems.repository.ExamRepository;
import com.ems.repository.ExamSessionRepository;
import com.ems.repository.QuestionRepository;
import com.ems.repository.UserRepository;
import com.ems.service.CertificationJourneyService;
import com.ems.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ExamWorkflowServiceImplTest {

	@Mock
	private CertificationJourneyService certificationJourneyService;

	@Mock
	private CertificationApplicationRepository certificationApplicationRepository;

	@Mock
	private CertificationRepository certificationRepository;

	@Mock
	private UserRepository userRepository;

	@Mock
	private ExamRepository examRepository;

	@Mock
	private QuestionRepository questionRepository;

	@Mock
	private ExamSessionRepository examSessionRepository;

	@Mock
	private PaymentService paymentService;

	private ExamWorkflowServiceImpl examWorkflowService;

	@BeforeEach
	void setUp() {
		examWorkflowService = new ExamWorkflowServiceImpl(
				certificationJourneyService,
				certificationApplicationRepository,
				certificationRepository,
				userRepository,
				examRepository,
				questionRepository,
				examSessionRepository,
				paymentService,
				new ObjectMapper());
	}

	@Test
	void startExam_whenApplicationFailed_throwsReapplyAndPaymentMessage() {
		User user = User.builder().id(10L).email("blocked@example.com").build();
		Exam exam = Exam.builder().id(20L).certificationLevel(CertificationLevel.L1).build();
		CertificationApplication application = CertificationApplication.builder()
				.id(30L)
				.user(user)
				.exam(exam)
				.applicationStatus(CertificationApplicationStatus.FAILED)
				.paymentStatus(PaymentStatus.SUCCESS)
				.scheduledExamTime(Instant.now().plusSeconds(300))
				.build();

		when(userRepository.findByEmailIgnoreCase("blocked@example.com")).thenReturn(Optional.of(user));
		when(certificationApplicationRepository.findByIdAndUser(30L, user)).thenReturn(Optional.of(application));

		BusinessException ex = assertThrows(
				BusinessException.class,
				() -> examWorkflowService.startExam(
						"blocked@example.com",
						30L,
						new ExamStartRequest(null, Boolean.TRUE, Instant.now())));

		assertThat(ex.getMessage()).contains("Re-apply and complete payment");
		verifyNoInteractions(questionRepository, examSessionRepository);
	}
}
