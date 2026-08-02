package com.ems.dto.response;

import java.util.List;

import com.ems.enums.QuestionSeverity;
import com.ems.enums.QuestionType;

public record ExamQuestionPayloadResponse(
        Long questionId,
        String questionCode,
        String questionText,
        QuestionType questionType,
        QuestionSeverity severity,
        List<String> options) {
}
