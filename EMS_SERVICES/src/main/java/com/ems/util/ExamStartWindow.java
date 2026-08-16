package com.ems.util;

import java.time.Duration;
import java.time.Instant;

/**
 * The stretch of time in which a booked exam may actually be started.
 *
 * <p>A booking is a commitment to sit at a particular time, not a note on the
 * application: a proctored slot only means anything if the sitting happens when
 * it was said it would. So an attempt may begin shortly before the booked time
 * and shortly after, and a candidate who cannot make it moves the booking
 * instead of turning up whenever they like.</p>
 *
 * <p>The grace is symmetric, so a candidate who is a few minutes early is not
 * made to wait and one who is a few minutes late is not turned away. It lives
 * here rather than in the service because three places need the same answer —
 * the start check, the scheduling check, and the two responses that tell the
 * client when its button should light up — and a window that disagreed between
 * them would show a candidate a live "Start" that the server then refused.</p>
 */
public final class ExamStartWindow {

    /** How long before and after the booked time an attempt may begin. */
    public static final Duration GRACE = Duration.ofMinutes(10);

    private ExamStartWindow() {
    }

    /** Earliest an attempt on this booking may begin; {@code null} when nothing is booked. */
    public static Instant opensAt(Instant scheduledExamTime) {
        return scheduledExamTime == null ? null : scheduledExamTime.minus(GRACE);
    }

    /** Latest an attempt on this booking may begin; {@code null} when nothing is booked. */
    public static Instant closesAt(Instant scheduledExamTime) {
        return scheduledExamTime == null ? null : scheduledExamTime.plus(GRACE);
    }

    /** Whether {@code at} falls inside the window. False when nothing is booked. */
    public static boolean isOpen(Instant scheduledExamTime, Instant at) {
        if (scheduledExamTime == null) {
            return false;
        }
        return !at.isBefore(opensAt(scheduledExamTime)) && !at.isAfter(closesAt(scheduledExamTime));
    }

    /** Whether the window has already shut by {@code at}. False when nothing is booked. */
    public static boolean hasClosed(Instant scheduledExamTime, Instant at) {
        return scheduledExamTime != null && at.isAfter(closesAt(scheduledExamTime));
    }
}
