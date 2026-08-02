package com.ems.service.impl;

import java.util.List;
import java.util.Locale;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.entity.CertificationApplication;
import com.ems.entity.ExamAttempt;
import com.ems.entity.Payment;
import com.ems.entity.User;
import com.ems.entity.Violation;
import com.ems.enums.ReportFormat;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.CertificationRepository;
import com.ems.repository.ExamAttemptRepository;
import com.ems.repository.ExamRepository;
import com.ems.repository.PaymentRepository;
import com.ems.repository.UserRepository;
import com.ems.repository.ViolationRepository;
import com.ems.service.ReportFileContent;
import com.ems.service.ReportService;
import com.ems.util.ReportCsvExporter;
import com.ems.util.ReportExcelExporter;
import com.ems.util.ReportPdfExporter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional(readOnly = true)
public class ReportsServiceImpl implements ReportService {

    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final PaymentRepository paymentRepository;
    private final CertificationRepository certificationRepository;
    private final CertificationApplicationRepository certificationApplicationRepository;
    private final ExamAttemptRepository examAttemptRepository;
    private final ViolationRepository violationRepository;

    @Override
    @Cacheable(cacheNames = "reports", key = "'users:' + #format")
    public ReportFileContent userReport(ReportFormat format) {
	log.info("Generating user report: format={}", format);
	String[] headers = { "User ID", "First Name", "Last Name", "Email", "Mobile", "Skill Level", "Organization",
		"Experience (yrs)", "Enabled" };

	List<String[]> rows = userRepository.findAll().stream()
		.map(u -> new String[] {
			u.getUserId(),
			u.getFirstName(),
			u.getLastName(),
			u.getEmail(),
			u.getMobileNumber(),
			u.getCurrentSkillLevel(),
			safeStr(u.getCurrentOrganization()),
			safeStr(u.getYearsOfExperience()),
			boolStr(u.isEnabled()) })
		.toList();

	return export(format, "User Report", "user-report", headers, rows);
    }

    @Override
    @Cacheable(cacheNames = "reports", key = "'exams:' + #format")
    public ReportFileContent examReport(ReportFormat format) {
	log.info("Generating exam report: format={}", format);
	String[] headers = { "Exam Code", "Exam Name", "Level", "Duration (min)", "Total Marks", "Passing %", "Status",
		"Published" };

	List<String[]> rows = examRepository.findAll().stream()
		.map(e -> new String[] {
			e.getExamCode(),
			e.getExamName(),
			e.getCertificationLevel().name(),
			safeStr(e.getDurationMinutes()),
			safeStr(e.getTotalMarks()),
			safeStr(e.getPassingPercentage()),
			e.getExamStatus().name(),
			boolStr(e.isPublished()) })
		.toList();

	return export(format, "Exam Report", "exam-report", headers, rows);
    }

    @Override
    @Cacheable(cacheNames = "reports", key = "'revenue:' + #format")
    public ReportFileContent revenueReport(ReportFormat format) {
	log.info("Generating revenue report: format={}", format);
	String[] headers = { "Transaction ID", "User ID", "Exam ID", "Amount", "Currency", "Provider", "Status", "Payment Date" };

	List<String[]> rows = paymentRepository.findAllByOrderByCreatedDateDesc().stream()
		.map(p -> new String[] {
			p.getTransactionId(),
			p.getUser().getUserId(),
			safeStr(p.getExam().getId()),
			safeStr(p.getAmount()),
			p.getCurrency(),
			p.getProvider(),
			p.getPaymentStatus().name(),
			safeStr(p.getPaymentDate()) })
		.toList();

	return export(format, "Revenue Report", "revenue-report", headers, rows);
    }

    @Override
    @Cacheable(cacheNames = "reports", key = "'certifications:' + #format")
    public ReportFileContent certificationReport(ReportFormat format) {
	log.info("Generating certification report: format={}", format);
	String[] headers = { "Application ID", "User ID", "Level", "Application Status", "Applied On", "Certification Status",
		"Issue Date", "Expiry Date" };

	List<CertificationApplication> applications = certificationApplicationRepository.findAll();
	List<String[]> rows = applications.stream()
		.map(app -> {
		    var cert = certificationRepository
			    .findFirstByUserAndCertificationLevelAndCertificationStatusOrderByExpiryDateDesc(
				    app.getUser(),
				    app.getCertificationLevel(),
				    com.ems.enums.CertificationStatus.ACTIVE)
			    .orElse(null);

		    return new String[] {
			    safeStr(app.getId()),
			    app.getUser().getUserId(),
			    app.getCertificationLevel().name(),
			    app.getApplicationStatus().name(),
			    safeStr(app.getAppliedOn()),
			    cert == null ? "N/A" : cert.getCertificationStatus().name(),
			    cert == null ? "N/A" : safeStr(cert.getIssueDate()),
			    cert == null ? "N/A" : safeStr(cert.getExpiryDate()) };
		})
		.toList();

	return export(format, "Certification Report", "certification-report", headers, rows);
    }

    @Override
    @Cacheable(cacheNames = "reports", key = "'results:' + #format")
    public ReportFileContent resultReport(ReportFormat format) {
	log.info("Generating result report: format={}", format);
	String[] headers = { "Attempt ID", "User ID", "Exam Code", "Total Questions", "Attempted", "Correct", "Wrong", "Obtained Marks",
		"Total Marks", "Percentage", "Result", "Submitted At" };

	List<String[]> rows = examAttemptRepository.findAllByOrderBySubmittedAtDesc().stream()
		.map(a -> new String[] {
			safeStr(a.getId()),
			a.getExamSession().getUser().getUserId(),
			a.getExamSession().getExam().getExamCode(),
			safeStr(a.getTotalQuestions()),
			safeStr(a.getAttemptedQuestions()),
			safeStr(a.getCorrectAnswers()),
			safeStr(a.getWrongAnswers()),
			safeStr(a.getObtainedMarks()),
			safeStr(a.getExamSession().getExam().getTotalMarks()),
			safeStr(a.getPercentage()),
			a.getResultStatus().name(),
			safeStr(a.getSubmittedAt()) })
		.toList();

	return export(format, "Result Report", "result-report", headers, rows);
    }

    @Override
    @Cacheable(cacheNames = "reports", key = "'violations:' + #format")
    public ReportFileContent violationReport(ReportFormat format) {
	log.info("Generating violation report: format={}", format);
	String[] headers = { "Violation ID", "Session ID", "User ID", "Violation Type", "Level", "Action Taken", "Detected At",
		"Description" };

	List<String[]> rows = violationRepository.findAllByOrderByDetectedAtDesc().stream()
		.map(v -> new String[] {
			safeStr(v.getId()),
			safeStr(v.getExamSession().getId()),
			v.getExamSession().getUser().getUserId(),
			v.getViolationType().name(),
			safeStr(v.getViolationLevel()),
			safeStr(v.getActionTaken()),
			safeStr(v.getDetectedAt()),
			safeStr(v.getDescription()) })
		.toList();

	return export(format, "Violation Report", "violation-report", headers, rows);
    }

    private ReportFileContent export(ReportFormat format, String title, String baseName, String[] headers,
	    List<String[]> rows) {
	byte[] content = switch (format) {
	    case PDF -> ReportPdfExporter.export(title, headers, rows);
	    case EXCEL -> ReportExcelExporter.export(title, headers, rows);
	    case CSV -> ReportCsvExporter.export(headers, rows);
	};
	return ReportFileContent.of(content, format, baseName);
    }

    private String safeStr(Object value) {
	return value == null ? "" : value.toString();
    }

    private String boolStr(boolean value) {
	return value ? "Yes" : "No";
    }
}
