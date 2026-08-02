package com.ems.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.ems.enums.CertificationApplicationStatus;
import com.ems.enums.CertificationLevel;
import com.ems.enums.PaymentStatus;

public record UserDashboardResponse(
        DashboardUserDetails user,
        List<CertificationSummaryResponse> activeCertifications,
        List<CertificationSummaryResponse> certificationHistory,
        List<DashboardExamStatus> examStatuses,
        DashboardReportSummary reportSummary) {

    public record DashboardUserDetails(
            String userId,
            String firstName,
            String lastName,
            String email,
            String mobileNumber,
            String currentSkillLevel,
            String currentOrganization,
            String qualification,
            String profilePhotoUrl) {
    }

    public record DashboardExamStatus(
            Long applicationId,
            CertificationLevel certificationLevel,
            CertificationApplicationStatus applicationStatus,
            PaymentStatus paymentStatus,
            LocalDate appliedOn,
            String remarks) {
    }

    public record DashboardReportSummary(
            long totalApplications,
            long activeCertifications,
            long expiredCertifications,
            long passedApplications,
            long failedApplications) {
    }
}
