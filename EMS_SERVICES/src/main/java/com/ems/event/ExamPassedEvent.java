package com.ems.event;

/**
 * Raised when a candidate clears an exam and the level has been awarded.
 *
 * <p>Carries only identifiers rather than entities: the event is handled after
 * the evaluating transaction commits, by which point a detached entity would
 * belong to a closed persistence context.
 *
 * @param email     candidate who sat the exam
 * @param sessionId exam session that was passed
 */
public record ExamPassedEvent(String email, Long sessionId) {
}
