package com.ems.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.ems.enums.CertificationLevel;

public record ExamStartResponse(
        Long applicationId,
        Long examId,
        String examCode,
        CertificationLevel certificationLevel,
        UUID sessionToken,
        Long examSessionId,
        Instant startedAt,
        int questionCount,
        List<Long> questionIds,
        ExamQuestionPayloadResponse firstQuestion) {
}
