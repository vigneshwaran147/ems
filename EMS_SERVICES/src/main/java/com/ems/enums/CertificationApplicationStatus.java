package com.ems.enums;

public enum CertificationApplicationStatus {
    APPLIED,
    ELIGIBLE,
    IN_PROGRESS,
    PASSED,

    /** The candidate sat the exam and did not reach the passing mark. */
    FAILED,

    /**
     * The attempt was ended by proctoring before it could be scored.
     *
     * <p>Distinct from {@link #FAILED} because the two are different events with
     * the same consequence, and telling them apart mattered enough that the code
     * was already doing it the only way it could: substring-matching a restart
     * note inside the free-text remarks column. A candidate reading their own
     * history, an invigilator auditing an exam and every branch that has to
     * decide whether an attempt was scored all need this distinction, and none
     * of them should have to parse prose to get it.</p>
     *
     * <p>Treated exactly like {@code FAILED} wherever the question is "may this
     * candidate re-apply" — it is terminal, it is re-appliable, and it does not
     * satisfy a prerequisite.</p>
     */
    TERMINATED,

    REJECTED,
    EXPIRED;

    /**
     * Whether this outcome closes the application without a pass.
     *
     * <p>{@code TERMINATED} joins {@code FAILED} everywhere this is asked. The
     * two differ in what happened, never in what follows: neither earns a
     * certificate, neither satisfies the prerequisite for the next level, and
     * both leave the candidate needing a fresh application.</p>
     */
    public boolean isUnsuccessfulAttempt() {
        return this == FAILED || this == TERMINATED;
    }

    /** Whether the candidate may open a fresh application from this one. */
    public boolean allowsReApplication() {
        return isUnsuccessfulAttempt() || this == EXPIRED || this == REJECTED;
    }
}
