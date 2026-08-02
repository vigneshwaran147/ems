package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.ExamAttempt;
import com.ems.entity.ExamSession;
import com.ems.entity.User;
import com.ems.enums.ResultStatus;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    Optional<ExamAttempt> findByExamSession(ExamSession examSession);

    Optional<ExamAttempt> findByExamSessionIdAndExamSessionUserEmailIgnoreCase(
            Long sessionId, String email);

    List<ExamAttempt> findByExamSessionUserEmailIgnoreCaseOrderBySubmittedAtDesc(String email);

    List<ExamAttempt> findByExamSessionUserAndResultStatusOrderBySubmittedAtDesc(
            User user, ResultStatus resultStatus);

    boolean existsByExamSession(ExamSession examSession);

    List<ExamAttempt> findAllByOrderBySubmittedAtDesc();
}
