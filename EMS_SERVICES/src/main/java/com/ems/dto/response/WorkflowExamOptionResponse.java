package com.ems.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.ems.enums.CertificationLevel;

public record WorkflowExamOptionResponse(
        UserWorkflowInfo userInfo,
        CertificationEligibilityResponse eligibility,
        List<WorkflowExamOption> availableExams) {

    public record UserWorkflowInfo(
            String userId,
            String email,
            String fullName,
            String currentSkillLevel,
            List<CertificationInfo> activeCertifications) {
    }

    public record CertificationInfo(
            CertificationLevel certificationLevel,
            String status,
            LocalDate issueDate,
            LocalDate expiryDate) {
    }

    public record WorkflowExamOption(
            Long examId,
            String examCode,
            String examName,
            CertificationLevel certificationLevel,
            Integer durationMinutes,
            BigDecimal totalMarks,
            BigDecimal passingPercentage,
            Instant scheduledStartTime,
            Instant scheduledEndTime) {
    }
}
