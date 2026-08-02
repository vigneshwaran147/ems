package com.ems.enums;

public enum QuestionSeverity {
    LOW,
    MEDIUM,
    HIGH;

    public String code() {
        return switch (this) {
            case LOW -> "L";
            case MEDIUM -> "M";
            case HIGH -> "H";
        };
    }
}
