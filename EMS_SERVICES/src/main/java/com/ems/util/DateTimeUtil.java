package com.ems.util;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

public final class DateTimeUtil {

    private DateTimeUtil() {
    }

    public static Instant nowUtc() {
        return Instant.now();
    }

    public static Instant plusMinutes(long minutes) {
        return nowUtc().plus(minutes, ChronoUnit.MINUTES);
    }
}
