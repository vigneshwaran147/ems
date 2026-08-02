package com.ems.enums;

public enum QuestionType {
    SINGLE_CHOICE,
    MULTIPLE_CHOICE;

    public String databaseValue() {
        return switch (this) {
            case SINGLE_CHOICE -> "Single Choice";
            case MULTIPLE_CHOICE -> "Multiple Choice";
        };
    }
}
