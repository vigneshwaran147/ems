package com.ems.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.ems.enums.CertificationLevel;
import com.ems.enums.ExamStatus;

public record ExamResponse(
        Long id,
        String examCode,
        String examName,
        CertificationLevel certificationLevel,
        Integer durationMinutes,
        BigDecimal totalMarks,
        BigDecimal passingPercentage,
        ExamStatus examStatus,
        boolean published,
        Instant scheduledStartTime,
        Instant scheduledEndTime,
        Instant createdAt,
        Instant updatedAt) {
}
