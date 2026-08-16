package com.ems.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.ems.enums.CertificationLevel;

/**
 * A certificate as presented to clients.
 *
 * <p>The descriptive fields — award title, tier, citation and competencies —
 * are resolved server-side from the level's certificate template. Clients
 * render what they are given rather than deciding what a certificate is called,
 * so the wording on screen always matches the wording on the issued PDF.
 */
public record CertificateResponse(
        String certificateNumber,
        String candidateName,
        String userId,
        CertificationLevel certificationLevel,
        LocalDate issueDate,
        LocalDate expiryDate,
        String verificationUrl,
        String certificateDownloadUrl,
        String awardTitle,
        String levelLabel,
        String tierLine,
        String citation,
        List<String> competencies,
        int levelIndex,
        int totalLevels) {
}
