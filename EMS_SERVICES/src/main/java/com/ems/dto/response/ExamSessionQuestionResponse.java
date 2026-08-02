package com.ems.dto.response;

import java.util.UUID;

public record ExamSessionQuestionResponse(
        UUID sessionToken,
        int questionNumber,
        int totalQuestions,
        ExamQuestionPayloadResponse question) {
}
