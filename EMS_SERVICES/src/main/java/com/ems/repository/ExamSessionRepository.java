package com.ems.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.ExamSession;
import com.ems.entity.Exam;
import com.ems.entity.User;
import com.ems.enums.ExamStatus;

public interface ExamSessionRepository extends JpaRepository<ExamSession, Long> {

    Optional<ExamSession> findByIdAndUserEmailIgnoreCase(Long id, String email);

    List<ExamSession> findBySessionStatusOrderBySessionStartTimeDesc(ExamStatus sessionStatus);

    Optional<ExamSession> findBySessionToken(UUID sessionToken);

    Optional<ExamSession> findBySessionTokenAndUserEmailIgnoreCase(UUID sessionToken, String email);

    Optional<ExamSession> findTopByUserAndExamOrderBySessionStartTimeDescIdDesc(User user, Exam exam);
}
