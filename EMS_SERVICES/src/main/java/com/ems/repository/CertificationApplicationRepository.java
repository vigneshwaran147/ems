package com.ems.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.ems.entity.CertificationApplication;
import com.ems.entity.Exam;
import com.ems.entity.User;
import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;

public interface CertificationApplicationRepository extends JpaRepository<CertificationApplication, Long> {

    List<CertificationApplication> findByUserOrderByAppliedOnDesc(User user);

    java.util.Optional<CertificationApplication> findByIdAndUser(Long id, User user);

    Optional<CertificationApplication> findTopByUserAndExamOrderByAppliedOnDescIdDesc(User user, Exam exam);

    Optional<CertificationApplication> findTopByUserAndExamAndApplicationStatusOrderByAppliedOnDescIdDesc(
            User user,
            Exam exam,
            CertificationApplicationStatus applicationStatus);

    Optional<CertificationApplication> findTopByUserAndExamAndApplicationStatusInOrderByAppliedOnDescIdDesc(
            User user,
            Exam exam,
            Collection<CertificationApplicationStatus> applicationStatuses);

    Optional<CertificationApplication> findTopByUserAndCertificationLevelOrderByAppliedOnDescIdDesc(
            User user,
            CertificationLevel certificationLevel);

    @Query("SELECT DISTINCT ca FROM CertificationApplication ca " +
            "LEFT JOIN FETCH ca.exam " +
            "WHERE ca.id = :id AND ca.user = :user")
    java.util.Optional<CertificationApplication> findByIdAndUserWithExam(Long id, User user);

    @Query("SELECT DISTINCT ca FROM CertificationApplication ca " +
            "LEFT JOIN FETCH ca.user u " +
            "LEFT JOIN FETCH ca.exam " +
            "WHERE ca.id = :id")
    java.util.Optional<CertificationApplication> findByIdWithAllRelationships(Long id);

    boolean existsByUserAndCertificationLevelAndApplicationStatusIn(
            User user,
            CertificationLevel certificationLevel,
            Collection<CertificationApplicationStatus> statuses);

    @Query("SELECT ca FROM CertificationApplication ca " +
            "LEFT JOIN FETCH ca.exam " +
            "WHERE ca.user = :user " +
            "AND ca.applicationStatus IN ('FAILED', 'TERMINATED', 'EXPIRED', 'REJECTED') " +
            "ORDER BY ca.appliedOn DESC")
    java.util.List<CertificationApplication> findFailedApplicationsForReApply(User user);
}
