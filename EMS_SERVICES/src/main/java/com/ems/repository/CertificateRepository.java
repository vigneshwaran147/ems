package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.ems.entity.Certificate;
import com.ems.entity.Certification;
import com.ems.entity.ExamAttempt;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    Optional<Certificate> findByCertificateNumberIgnoreCase(String certificateNumber);

    @Query("SELECT c FROM Certificate c " +
            "JOIN FETCH c.certification cert " +
            "JOIN FETCH cert.user u " +
            "WHERE LOWER(c.certificateNumber) = LOWER(:certificateNumber) " +
            "AND LOWER(u.email) = LOWER(:email)")
    Optional<Certificate> findByCertificateNumberIgnoreCaseAndCertificationUserEmailIgnoreCase(
            String certificateNumber,
            String email);

    @Query("SELECT c FROM Certificate c " +
            "JOIN FETCH c.certification cert " +
            "JOIN FETCH cert.user u " +
            "WHERE LOWER(u.email) = LOWER(:email) " +
            "ORDER BY c.issueDate DESC")
    List<Certificate> findByCertificationUserEmailIgnoreCaseOrderByIssueDateDesc(String email);

    Optional<Certificate> findByExamAttempt(ExamAttempt examAttempt);

    Optional<Certificate> findByCertificationAndExamAttemptNotNull(Certification certification);
}
