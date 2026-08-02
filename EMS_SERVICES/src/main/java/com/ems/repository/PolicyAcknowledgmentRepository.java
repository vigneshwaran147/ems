package com.ems.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ems.entity.PolicyAcknowledgment;
import com.ems.entity.User;

/** Repository for managing policy acknowledgment records. */
@Repository
public interface PolicyAcknowledgmentRepository extends JpaRepository<PolicyAcknowledgment, Long> {

    /** Find the most recent policy acknowledgment for a user's exam session. */
    @Query("SELECT pa FROM PolicyAcknowledgment pa " +
            "WHERE pa.user = :user AND pa.examSession.id = :examSessionId " +
            "ORDER BY pa.acknowledgedAt DESC " +
            "LIMIT 1")
    Optional<PolicyAcknowledgment> findLatestByUserAndExamSession(
            @Param("user") User user,
            @Param("examSessionId") Long examSessionId);

    /** Find all policy acknowledgments for a user within a date range. */
    @Query("SELECT pa FROM PolicyAcknowledgment pa " +
            "WHERE pa.user = :user AND pa.acknowledgedAt " +
            "BETWEEN :startDate AND :endDate " +
            "ORDER BY pa.acknowledgedAt DESC")
    List<PolicyAcknowledgment> findByUserAndDateRange(
            @Param("user") User user,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);

    /** Count policy acknowledgments for a user. */
    @Query("SELECT COUNT(pa) FROM PolicyAcknowledgment pa WHERE pa.user = :user AND pa.acknowledged = true")
    long countAcknowledgedByUser(@Param("user") User user);

    /** Find all failed acknowledgment attempts (where acknowledged = false). */
    @Query("SELECT pa FROM PolicyAcknowledgment pa " +
            "WHERE pa.user = :user AND pa.acknowledged = false " +
            "ORDER BY pa.acknowledgedAt DESC")
    List<PolicyAcknowledgment> findFailedAttemptsByUser(@Param("user") User user);
}
