package com.ems.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotNull;

public record QuestionAnswerSubmissionRequest(
        @NotNull Long questionId,
        List<String> selectedOptions) {
}
