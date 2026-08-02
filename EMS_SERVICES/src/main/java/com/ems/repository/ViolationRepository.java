package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.ExamSession;
import com.ems.entity.User;
import com.ems.entity.Violation;
import com.ems.enums.ProctoringAction;

public interface ViolationRepository extends JpaRepository<Violation, Long> {

    List<Violation> findByExamSessionOrderByDetectedAtDesc(ExamSession examSession);

    long countByExamSession(ExamSession examSession);

    long countByExamSessionAndActionTaken(ExamSession examSession, ProctoringAction actionTaken);

    Optional<Violation> findTopByExamSessionOrderByDetectedAtDesc(ExamSession examSession);

    List<Violation> findAllByOrderByDetectedAtDesc();

    List<Violation> findByExamSessionUserOrderByDetectedAtDesc(User user);
}
