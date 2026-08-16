package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.ExamSession;
import com.ems.entity.User;
import com.ems.entity.Violation;
import com.ems.enums.ProctoringAction;
import com.ems.enums.ViolationType;

public interface ViolationRepository extends JpaRepository<Violation, Long> {

    List<Violation> findByExamSessionOrderByDetectedAtDesc(ExamSession examSession);

    long countByExamSession(ExamSession examSession);

    /**
     * How many detections of one type this session has already produced.
     *
     * <p>Backs the tolerance for unidentified sounds: the first few are a cough
     * and the ones after them are a pattern, and only the session's own history
     * can tell those apart. Counted from the violation rows rather than a
     * counter on the session so it survives a restart and stays auditable.</p>
     */
    long countByExamSessionAndViolationType(ExamSession examSession, ViolationType violationType);

    long countByExamSessionAndActionTaken(ExamSession examSession, ProctoringAction actionTaken);

    Optional<Violation> findTopByExamSessionOrderByDetectedAtDesc(ExamSession examSession);

    List<Violation> findAllByOrderByDetectedAtDesc();

    List<Violation> findByExamSessionUserOrderByDetectedAtDesc(User user);
}
