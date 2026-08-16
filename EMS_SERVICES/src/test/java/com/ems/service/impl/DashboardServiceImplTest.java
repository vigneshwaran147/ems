package com.ems.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.ems.dto.response.CertificationEligibilityResponse;
import com.ems.entity.CertificationApplication;
import com.ems.entity.Exam;
import com.ems.entity.ExamSession;
import com.ems.entity.User;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.ExamStatus;
import com.ems.enums.PaymentStatus;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.CertificationRepository;
import com.ems.repository.ExamAttemptRepository;
import com.ems.repository.ExamSessionRepository;
import com.ems.repository.UserRepository;
import com.ems.service.CertificationJourneyService;

/**
 * Covers the dashboard's invalidated-session reconciler.
 *
 * The reconciler is the only place a paid, in-progress application is closed
 * without the candidate doing anything, so both directions of that judgement are
 * asserted here: the earlier attempt's session it must not act on, and this
 * application's own session it must.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DashboardServiceImplTest {

	private static final String EMAIL = "candidate@example.com";

	@Mock
	private UserRepository userRepository;

	@Mock
	private CertificationRepository certificationRepository;

	@Mock
	private CertificationApplicationRepository certificationApplicationRepository;

	@Mock
	private ExamSessionRepository examSessionRepository;

	@Mock
	private ExamAttemptRepository examAttemptRepository;

	@Mock
	private CertificationJourneyService certificationJourneyService;

	private DashboardServiceImpl dashboardService;

	private User user;
	private Exam exam;

	@BeforeEach
	void setUp() {
		dashboardService = new DashboardServiceImpl(
				userRepository,
				certificationRepository,
				certificationApplicationRepository,
				examSessionRepository,
				examAttemptRepository,
				certificationJourneyService);

		user = User.builder().id(10L).userId("EMS-1").email(EMAIL).build();
		exam = Exam.builder().id(20L).examCode("EX-L1").certificationLevel(CertificationLevel.L1).build();

		when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
		when(certificationRepository.findByUserOrderByIssueDateDesc(user)).thenReturn(List.of());
		when(examAttemptRepository.findByExamSessionUserEmailIgnoreCaseOrderBySubmittedAtDesc(EMAIL))
				.thenReturn(List.of());
		when(certificationJourneyService.getEligibility(anyString(), any(CertificationLevel.class)))
				.thenAnswer(invocation -> new CertificationEligibilityResponse(
						invocation.getArgument(1), false, "not eligible", null, null));
	}

	/**
	 * The reported failure: re-apply, pay, and the dashboard closes the new
	 * application on the strength of the previous attempt's invalidated session.
	 * Because a fresh application has no session of its own, that verdict landed
	 * on every re-application in turn, and the candidate could never start.
	 *
	 * <p>The previous attempt's session is present here and belongs to another
	 * application, which is exactly the situation the old user-and-exam lookup
	 * could not distinguish from this application's own.</p>
	 */
	@Test
	void reconcile_whenInvalidatedSessionBelongsToEarlierApplication_leavesNewApplicationInProgress() {
		CertificationApplication reApplication = application(33L);

		when(certificationApplicationRepository.findByUserOrderByAppliedOnDesc(user))
				.thenReturn(List.of(reApplication));
		when(examSessionRepository.findTopByCertificationApplicationOrderBySessionStartTimeDescIdDesc(reApplication))
				.thenReturn(Optional.empty());

		dashboardService.getCurrentUserDashboard(EMAIL);

		assertThat(reApplication.getApplicationStatus())
				.isEqualTo(CertificationApplicationStatus.IN_PROGRESS);
		verify(certificationApplicationRepository, never()).save(any(CertificationApplication.class));
	}

	/**
	 * The backstop the reconciler exists for, which the fix must not weaken: a
	 * session invalidated under this application still closes it — as
	 * TERMINATED, because the attempt was ended rather than scored.
	 */
	@Test
	void reconcile_whenOwnSessionWasInvalidated_marksApplicationTerminated() {
		CertificationApplication application = application(37L);

		when(certificationApplicationRepository.findByUserOrderByAppliedOnDesc(user))
				.thenReturn(List.of(application));
		when(examSessionRepository.findTopByCertificationApplicationOrderBySessionStartTimeDescIdDesc(application))
				.thenReturn(Optional.of(invalidatedSession(application)));

		dashboardService.getCurrentUserDashboard(EMAIL);

		assertThat(application.getApplicationStatus()).isEqualTo(CertificationApplicationStatus.TERMINATED);
		assertThat(application.getRemarks()).contains("Re-apply and complete payment");
		verify(certificationApplicationRepository).save(application);
	}

	private CertificationApplication application(Long id) {
		return CertificationApplication.builder()
				.id(id)
				.user(user)
				.exam(exam)
				.certificationLevel(CertificationLevel.L1)
				.applicationStatus(CertificationApplicationStatus.IN_PROGRESS)
				.paymentStatus(PaymentStatus.SUCCESS)
				.appliedOn(LocalDate.of(2026, 8, 15))
				.build();
	}

	private ExamSession invalidatedSession(CertificationApplication application) {
		return ExamSession.builder()
				.id(300L)
				.sessionToken(UUID.randomUUID())
				.user(user)
				.exam(exam)
				.certificationApplication(application)
				.sessionStartTime(Instant.parse("2026-08-15T14:30:00Z"))
				.sessionStatus(ExamStatus.INVALIDATED)
				.build();
	}
}
