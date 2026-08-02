package com.ems.security;

import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.ems.exception.BusinessException;

@Component
public class PasswordPolicyValidator {

    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])(?!.*\\s).{8,128}$");

    public void validateOrThrow(String password) {
        if (password == null || !STRONG_PASSWORD_PATTERN.matcher(password).matches()) {
            throw new BusinessException(
                    "Password must be 8-128 characters and include uppercase, lowercase, digit, and special character with no spaces",
                    HttpStatus.BAD_REQUEST);
        }
    }
}
