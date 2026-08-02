package com.ems.service.impl;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.dto.request.RecordingMetadataRequest;
import com.ems.dto.request.SessionMonitoringUpdateRequest;
import com.ems.dto.request.ViolationReportRequest;
import com.ems.dto.response.ProctoringSessionResponse;
import com.ems.dto.response.VideoRecordingResponse;
import com.ems.dto.response.ViolationResponse;
import com.ems.dto.response.ViolationSummaryResponse;
import com.ems.entity.CertificationApplication;
import com.ems.entity.ExamSession;
import com.ems.entity.VideoRecording;
import com.ems.entity.Violation;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.ExamStatus;
import com.ems.enums.ProctoringAction;
import com.ems.enums.ViolationType;
import com.ems.exception.BusinessException;
import com.ems.exception.ResourceNotFoundException;
import com.ems.repository.CertificationApplicationRepository;
import com.ems.repository.ExamSessionRepository;
import com.ems.repository.VideoRecordingRepository;
import com.ems.repository.ViolationRepository;
import com.ems.service.ProctoringService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional
public class ProctoringServiceImpl implements ProctoringService {

	private static final Set<ViolationType> TRACKED_VIOLATIONS = EnumSet.of(
			ViolationType.TAB_SWITCH,
			ViolationType.WINDOW_MINIMIZED,
			ViolationType.WINDOW_FOCUS_LOST,
			ViolationType.WEBCAM_OFF,
			ViolationType.BROWSER_MONITORING,
			ViolationType.SESSION_TAMPERING,
			ViolationType.MULTIPLE_LOGIN);

	private final ExamSessionRepository examSessionRepository;
	private final VideoRecordingRepository videoRecordingRepository;
	private final ViolationRepository violationRepository;
	private final CertificationApplicationRepository certificationApplicationRepository;

	@Override
	public VideoRecordingResponse recordVideoMetadata(String email, Long sessionId, RecordingMetadataRequest request) {
		ExamSession session = findOwnedSession(email, sessionId);
		validateSessionStillActive(session);

		VideoRecording recording = VideoRecording.builder()
				.examSession(session)
				.fileLocation(request.fileLocation())
				.recordingStartTime(request.recordingStartTime())
				.recordingEndTime(request.recordingEndTime())
				.recordingDurationSeconds(request.recordingDurationSeconds())
				.build();

		VideoRecording savedRecording = videoRecordingRepository.save(recording);
		log.info("Proctoring recording metadata saved: sessionId={}, recordingId={}",
				sessionId, savedRecording.getId());
		return toRecordingResponse(savedRecording);
	}

	@Override
	public ViolationResponse reportViolation(String email, Long sessionId, ViolationReportRequest request) {
		ExamSession session = findOwnedSession(email, sessionId);
		validateSessionStillActive(session);
		validateViolationType(request.violationType());

		int nextViolationLevel = session.getViolationCount() + 1;
		ProctoringAction actionTaken = nextViolationLevel >= 3
				? ProctoringAction.EXAM_TERMINATED
				: ProctoringAction.WARNING;

		Violation violation = Violation.builder()
				.examSession(session)
				.violationType(request.violationType())
				.violationLevel(nextViolationLevel)
				.description(request.description())
				.detectedAt(Instant.now())
				.actionTaken(actionTaken)
				.build();

		Violation savedViolation = violationRepository.save(violation);

		session.setViolationCount(nextViolationLevel);
		if (actionTaken == ProctoringAction.EXAM_TERMINATED) {
			session.setSessionStatus(ExamStatus.INVALIDATED);
			session.setSessionEndTime(Instant.now());
		}
		examSessionRepository.save(session);

		if (actionTaken == ProctoringAction.EXAM_TERMINATED) {
			markLatestApplicationAsFailedForRestart(session);
		}

		log.info("Proctoring violation recorded: sessionId={}, violationType={}, level={}, action={}",
				sessionId, request.violationType(), nextViolationLevel, actionTaken);
		return toViolationResponse(savedViolation);
	}

	private void markLatestApplicationAsFailedForRestart(ExamSession session) {
		CertificationApplication application = certificationApplicationRepository
				.findTopByUserAndExamAndApplicationStatusOrderByAppliedOnDescIdDesc(
						session.getUser(),
						session.getExam(),
						CertificationApplicationStatus.IN_PROGRESS)
				.or(() -> certificationApplicationRepository
						.findTopByUserAndExamAndApplicationStatusInOrderByAppliedOnDescIdDesc(
								session.getUser(),
								session.getExam(),
								Set.of(CertificationApplicationStatus.APPLIED, CertificationApplicationStatus.ELIGIBLE)))
				.or(() -> certificationApplicationRepository
						.findTopByUserAndExamOrderByAppliedOnDescIdDesc(session.getUser(), session.getExam()))
				.orElse(null);

		if (application == null) {
			log.warn("No certification application found to mark as failed after exam invalidation: sessionId={} examCode={}",
					session.getId(), session.getExam().getExamCode());
			return;
		}

		if (application.getApplicationStatus() == CertificationApplicationStatus.APPLIED
				|| application.getApplicationStatus() == CertificationApplicationStatus.ELIGIBLE
				|| application.getApplicationStatus() == CertificationApplicationStatus.IN_PROGRESS) {
			application.setApplicationStatus(CertificationApplicationStatus.FAILED);
			String restartNote = "Exam invalidated after 3 proctoring violations. Re-apply and complete payment to restart from question 1.";
			if (application.getRemarks() == null || application.getRemarks().isBlank()) {
				application.setRemarks(restartNote);
			} else if (!application.getRemarks().contains(restartNote)) {
				application.setRemarks(application.getRemarks() + " | " + restartNote);
			}
			certificationApplicationRepository.save(application);
		}
	}

	@Override
	@Transactional(readOnly = true)
	public List<ViolationResponse> getSessionViolations(String email, Long sessionId) {
		ExamSession session = findOwnedSession(email, sessionId);
		return violationRepository.findByExamSessionOrderByDetectedAtDesc(session).stream()
				.map(this::toViolationResponse)
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public ViolationSummaryResponse getSessionViolationSummary(String email, Long sessionId) {
		ExamSession session = findOwnedSession(email, sessionId);
		return buildViolationSummary(session);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ViolationResponse> getSessionViolationsForAdmin(Long sessionId) {
		ExamSession session = findSessionById(sessionId);
		return violationRepository.findByExamSessionOrderByDetectedAtDesc(session).stream()
				.map(this::toViolationResponse)
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public ViolationSummaryResponse getSessionViolationSummaryForAdmin(Long sessionId) {
		ExamSession session = findSessionById(sessionId);
		return buildViolationSummary(session);
	}

	@Override
	public ProctoringSessionResponse updateSessionMonitoring(String email, Long sessionId,
			SessionMonitoringUpdateRequest request) {
		ExamSession session = findOwnedSession(email, sessionId);
		validateSessionStillActive(session);

		if (request.browserFingerprint() != null && !request.browserFingerprint().isBlank()) {
			session.setBrowserFingerprint(request.browserFingerprint().trim());
		}
		if (request.ipAddress() != null && !request.ipAddress().isBlank()) {
			session.setIpAddress(request.ipAddress().trim());
		}

		ExamSession savedSession = examSessionRepository.save(session);
		return toSessionResponse(savedSession);
	}

	@Override
	@Transactional(readOnly = true)
	public ProctoringSessionResponse getSessionSummary(String email, Long sessionId) {
		return toSessionResponse(findOwnedSession(email, sessionId));
	}

	@Override
	@Transactional(readOnly = true)
	public List<ProctoringSessionResponse> getActiveSessions() {
		return examSessionRepository.findBySessionStatusOrderBySessionStartTimeDesc(ExamStatus.IN_PROGRESS).stream()
				.map(this::toSessionResponse)
				.toList();
	}

	private ExamSession findOwnedSession(String email, Long sessionId) {
		return examSessionRepository.findByIdAndUserEmailIgnoreCase(sessionId, email)
				.orElseThrow(() -> new ResourceNotFoundException("Exam session not found"));
	}

	private ExamSession findSessionById(Long sessionId) {
		return examSessionRepository.findById(sessionId)
				.orElseThrow(() -> new ResourceNotFoundException("Exam session not found"));
	}

	private void validateViolationType(ViolationType violationType) {
		if (!TRACKED_VIOLATIONS.contains(violationType)) {
			throw new BusinessException("Unsupported violation type for violation management", HttpStatus.BAD_REQUEST);
		}
	}

	private void validateSessionStillActive(ExamSession session) {
		if (session.getSessionStatus() != ExamStatus.IN_PROGRESS) {
			throw new BusinessException("Exam session is not active for proctoring updates", HttpStatus.BAD_REQUEST);
		}
	}

	private ProctoringSessionResponse toSessionResponse(ExamSession session) {
		return new ProctoringSessionResponse(
				session.getId(),
				session.getSessionToken(),
				session.getUser().getUserId(),
				session.getExam().getExamCode(),
				session.getSessionStatus(),
				session.getViolationCount(),
				session.getBrowserFingerprint(),
				session.getIpAddress(),
				session.getSessionStartTime(),
				session.getSessionEndTime(),
				violationRepository.findByExamSessionOrderByDetectedAtDesc(session).stream()
						.map(this::toViolationResponse)
						.toList(),
				videoRecordingRepository.findByExamSessionOrderByRecordingStartTimeDesc(session).stream()
						.map(this::toRecordingResponse)
						.toList());
	}

	private ViolationResponse toViolationResponse(Violation violation) {
		String message = violation.getActionTaken() == ProctoringAction.EXAM_TERMINATED
				? "3rd violation detected. Exam terminated automatically."
				: "Violation recorded. Warning issued to candidate.";

		return new ViolationResponse(
				violation.getId(),
				violation.getExamSession().getId(),
				violation.getViolationType(),
				violation.getViolationLevel(),
				violation.getDescription(),
				violation.getDetectedAt(),
				violation.getActionTaken(),
				message,
				violation.getActionTaken() == ProctoringAction.EXAM_TERMINATED);
	}

	private ViolationSummaryResponse buildViolationSummary(ExamSession session) {
		int totalViolations = (int) violationRepository.countByExamSession(session);
		int warningCount = (int) violationRepository.countByExamSessionAndActionTaken(session, ProctoringAction.WARNING);
		boolean terminated = session.getSessionStatus() == ExamStatus.INVALIDATED;

		Violation latestViolation = violationRepository.findTopByExamSessionOrderByDetectedAtDesc(session).orElse(null);
		ViolationType lastType = latestViolation == null ? null : latestViolation.getViolationType();
		String lastActionMessage = latestViolation == null
				? "No violations reported yet"
				: toViolationResponse(latestViolation).policyMessage();

		return new ViolationSummaryResponse(
				session.getId(),
				totalViolations,
				warningCount,
				terminated,
				session.getSessionStatus(),
				lastType,
				lastActionMessage);
	}

	private VideoRecordingResponse toRecordingResponse(VideoRecording recording) {
		return new VideoRecordingResponse(
				recording.getId(),
				recording.getExamSession().getId(),
				recording.getFileLocation(),
				recording.getRecordingStartTime(),
				recording.getRecordingEndTime(),
				recording.getRecordingDurationSeconds());
	}
}
