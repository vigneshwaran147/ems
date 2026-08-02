package com.ems.service;

import java.util.List;

import com.ems.dto.response.AdminPaymentResponse;
import com.ems.dto.response.AdminUserResponse;
import com.ems.dto.response.AdminViolationResponse;
import com.ems.dto.response.CertificateResponse;
import com.ems.dto.response.CertificateVerificationResponse;
import com.ems.dto.response.CertificationApplicationResponse;
import com.ems.dto.response.CertificationSummaryResponse;
import com.ems.dto.response.QuestionResponse;
import com.ems.dto.response.VideoRecordingResponse;
import com.ems.enums.CertificationLevel;
import com.ems.enums.QuestionSeverity;

public interface AdminPortalService {

    List<AdminUserResponse> searchUsers(String searchText, Boolean enabled);

    AdminUserResponse getUserById(Long userId);

    AdminUserResponse setUserEnabled(Long userId, boolean enabled);

    AdminUserResponse setUserLocked(Long userId, boolean locked);

    List<QuestionResponse> searchQuestions(String questionCode, CertificationLevel level,
            QuestionSeverity severity, Boolean active, String searchText);

    List<AdminPaymentResponse> getAllPayments();

    List<CertificationApplicationResponse> getAllApplications();

    List<CertificationSummaryResponse> getAllCertifications();

    List<CertificateResponse> getAllCertificates();

    CertificateVerificationResponse verifyCertificate(String certificateNumber);

    List<AdminViolationResponse> getAllViolations();

    List<AdminViolationResponse> getViolationsForSession(Long sessionId);

    List<VideoRecordingResponse> getAllRecordings();

    List<VideoRecordingResponse> getRecordingsForSession(Long sessionId);
}
