package com.ems.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * The draft of an attempt, as the server last received it.
 *
 * <p>Returned both by the autosave itself — so the client can confirm the save
 * landed rather than assume it — and inside the exam-start payload when an
 * interrupted attempt is rejoined.</p>
 *
 * @param answers               answers recorded so far
 * @param markedForReview       question ids flagged to revisit
 * @param currentQuestionNumber 1-indexed question the candidate was last on
 * @param savedAt               when this draft was written; null if never
 * @param remainingSeconds      time left in the attempt at the moment of reply
 */
public record ExamProgressResponse(
        UUID sessionToken,
        List<SavedAnswer> answers,
        List<Long> markedForReview,
        Integer currentQuestionNumber,
        Instant savedAt,
        long remainingSeconds) {

    public record SavedAnswer(Long questionId, List<String> selectedOptions) {
    }
}
