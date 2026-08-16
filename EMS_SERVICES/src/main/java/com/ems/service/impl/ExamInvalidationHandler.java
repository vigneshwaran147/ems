package com.ems.service.impl;

import java.util.Set;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.ems.entity.CertificationApplication;
import com.ems.entity.ExamSession;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.repository.CertificationApplicationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Single owner of the "exam invalidated by proctoring" side effect.
 *
 * <p>Extracted so the legacy {@code /api/proctoring} path and the AI proctoring
 * path at {@code /api/proctor/log-violation} cannot drift: both terminate a
 * candidate through exactly the same rule, which marks the live certification
 * application {@code TERMINATED} so the candidate must re-apply and pay to
 * restart from question one.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class ExamInvalidationHandler {

    static final String RESTART_NOTE =
            "Exam invalidated after 3 proctoring violations. Re-apply and complete payment to restart from question 1.";

    private final CertificationApplicationRepository certificationApplicationRepository;

    /**
     * Marks the candidate's live application as terminated after their session
     * was invalidated. Safe to call more than once for the same session: an
     * application already in a terminal state is left untouched.
     *
     * <p>{@code TERMINATED} rather than {@code FAILED}: the attempt was never
     * scored, and recording it as a failed exam misreports what happened to
     * anyone reading the candidate's history afterwards.</p>
     */
    public void markLatestApplicationAsFailedForRestart(ExamSession session) {
        CertificationApplication application = resolveApplication(session);

        if (application == null) {
            log.warn("No certification application found to mark as terminated after exam invalidation: sessionId={} examCode={}",
                    session.getId(), session.getExam().getExamCode());
            return;
        }

        if (application.getApplicationStatus() != CertificationApplicationStatus.APPLIED
                && application.getApplicationStatus() != CertificationApplicationStatus.ELIGIBLE
                && application.getApplicationStatus() != CertificationApplicationStatus.IN_PROGRESS) {
            return;
        }

        application.setApplicationStatus(CertificationApplicationStatus.TERMINATED);
        application.setRemarks(appendRestartNote(application.getRemarks()));
        certificationApplicationRepository.save(application);

        log.info("Certification application marked TERMINATED after proctoring invalidation: sessionId={} applicationId={}",
                session.getId(), application.getId());
    }

    private CertificationApplication resolveApplication(ExamSession session) {
        return certificationApplicationRepository
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
    }

    private String appendRestartNote(String existingRemarks) {
        if (existingRemarks == null || existingRemarks.isBlank()) {
            return RESTART_NOTE;
        }
        if (existingRemarks.contains(RESTART_NOTE)) {
            return existingRemarks;
        }
        return existingRemarks + " | " + RESTART_NOTE;
    }
}
