package com.ems.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.ems.enums.CertificationLevel;
import com.ems.enums.QuestionCategory;
import com.ems.enums.QuestionSeverity;
import com.ems.enums.QuestionType;

public record QuestionResponse(
        Long id,
        String questionCode,
        CertificationLevel certificationLevel,
        QuestionCategory questionCategory,
        QuestionType questionType,
        String questionText,
        List<String> options,
        List<String> correctOptions,
        QuestionSeverity severity,
        BigDecimal marks,
        boolean active,
        Instant createdAt,
        Instant updatedAt) {
}
