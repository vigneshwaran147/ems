package com.ems.service;

import java.util.List;

import com.ems.dto.response.CertificateResponse;
import com.ems.dto.response.CertificateVerificationResponse;

public interface CertificateService {

    CertificateResponse generateForSession(String email, Long sessionId);

    List<CertificateResponse> getMyCertificates(String email);

    CertificateResponse getMyCertificate(String email, String certificateNumber);

    CertificateVerificationResponse verify(String certificateNumber);

    CertificateFileContent downloadMyCertificate(String email, String certificateNumber);

    CertificateFileContent downloadCertificateForAdmin(String certificateNumber);

    Object diagnoseCertificatesForUser(String email);

    java.util.Map<String, Object> generateMissingCertificates(String email);

    java.util.Map<String, Object> regenerateMissingPdfFiles(String email);
}
