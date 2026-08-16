package com.ems.dto.request;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * An autosave of an attempt in flight.
 *
 * <p>Sent repeatedly while the candidate works, so it carries the whole draft
 * rather than a delta: a save that arrives after a reconnection has to be able
 * to stand alone, and an ordering guarantee between two of these is not
 * something an unreliable network can offer.</p>
 *
 * @param answers            every answer given so far, in submission shape
 * @param markedForReview    question ids the candidate flagged to revisit
 * @param currentQuestionNumber 1-indexed question they were last on
 */
public record ExamProgressSaveRequest(
        @NotNull @Valid List<QuestionAnswerSubmissionRequest> answers,
        List<Long> markedForReview,
        @Positive Integer currentQuestionNumber) {
}
