package com.ems.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.dto.response.CertificationSummaryResponse;
import com.ems.dto.response.UserDashboardResponse;
import com.ems.entity.CertificationApplication;
import com.ems.entity.Certification;
import com.ems.entity.ExamSession;
import com.ems.entity.User;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationStatus;
import com.ems.enums.ExamStatus;
import com.ems.exception.ResourceNotFoundException;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.CertificationRepository;
import com.ems.repository.ExamSessionRepository;
import com.ems.repository.UserRepository;
import com.ems.service.DashboardService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

	private static final String RESTART_NOTE = "Exam invalidated after 3 proctoring violations. Re-apply and complete payment to restart from question 1.";

    private final UserRepository userRepository;
    private final CertificationRepository certificationRepository;
    private final CertificationApplicationRepository certificationApplicationRepository;
	private final ExamSessionRepository examSessionRepository;

    @Override
	@Transactional
    @Cacheable(cacheNames = "dashboard", key = "#email")
    public UserDashboardResponse getCurrentUserDashboard(String email) {
	User user = userRepository.findByEmailIgnoreCase(email)
		.orElseThrow(() -> new ResourceNotFoundException("User not found"));

	List<Certification> certifications = certificationRepository.findByUserOrderByIssueDateDesc(user);
	List<CertificationSummaryResponse> certificationHistory = certifications.stream()
		.map(this::toCertificationSummary)
		.toList();

	List<CertificationSummaryResponse> activeCertifications = certifications.stream()
		.filter(c -> c.getCertificationStatus() == CertificationStatus.ACTIVE)
		.map(this::toCertificationSummary)
		.toList();

	List<CertificationApplication> applications = new ArrayList<>(
			certificationApplicationRepository.findByUserOrderByAppliedOnDesc(user));
	reconcileInvalidatedInProgressApplications(applications);

	List<UserDashboardResponse.DashboardExamStatus> examStatuses = applications.stream()
		.map(application -> new UserDashboardResponse.DashboardExamStatus(
			application.getId(),
			application.getCertificationLevel(),
			application.getApplicationStatus(),
			application.getPaymentStatus(),
			application.getAppliedOn(),
			application.getRemarks()))
		.toList();

	long failedApplications = examStatuses.stream()
		.filter(status -> status.applicationStatus() == CertificationApplicationStatus.FAILED)
		.count();
	long passedApplications = examStatuses.stream()
		.filter(status -> status.applicationStatus() == CertificationApplicationStatus.PASSED)
		.count();
	long expiredCertifications = certifications.stream()
		.filter(certification -> certification.getCertificationStatus() == CertificationStatus.EXPIRED)
		.count();

	return new UserDashboardResponse(
		new UserDashboardResponse.DashboardUserDetails(
			user.getUserId(),
			user.getFirstName(),
			user.getLastName(),
			user.getEmail(),
			user.getMobileNumber(),
			user.getCurrentSkillLevel(),
			user.getCurrentOrganization(),
			user.getQualification(),
			user.getProfilePhotoKey() == null ? null : "/api/users/profile/photo"),
		activeCertifications,
		certificationHistory,
		examStatuses,
		new UserDashboardResponse.DashboardReportSummary(
			examStatuses.size(),
			activeCertifications.size(),
			expiredCertifications,
			passedApplications,
			failedApplications));
    }

    private void reconcileInvalidatedInProgressApplications(List<CertificationApplication> applications) {
	for (CertificationApplication application : applications) {
	    if (application.getApplicationStatus() != CertificationApplicationStatus.IN_PROGRESS || application.getExam() == null) {
		continue;
	    }

	    ExamSession latestSession = examSessionRepository
		    .findTopByUserAndExamOrderBySessionStartTimeDescIdDesc(application.getUser(), application.getExam())
		    .orElse(null);

	    if (latestSession == null || latestSession.getSessionStatus() != ExamStatus.INVALIDATED) {
		continue;
	    }

	    application.setApplicationStatus(CertificationApplicationStatus.FAILED);
	    String remarks = application.getRemarks();
	    if (remarks == null || remarks.isBlank()) {
		application.setRemarks(RESTART_NOTE);
	    } else if (!remarks.contains(RESTART_NOTE)) {
		application.setRemarks(remarks + " | " + RESTART_NOTE);
	    }
	    certificationApplicationRepository.save(application);
	}
    }

    private CertificationSummaryResponse toCertificationSummary(Certification certification) {
	return new CertificationSummaryResponse(
		certification.getId(),
		certification.getCertificationLevel(),
		certification.getCertificationStatus(),
		certification.getIssueDate(),
		certification.getExpiryDate());
    }
}
