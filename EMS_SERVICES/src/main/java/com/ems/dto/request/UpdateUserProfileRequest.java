package com.ems.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Size(max = 20) String mobileNumber,
        String profilePhoto,
        @Size(max = 1000) String address,
        Integer yearsOfExperience,
        @Pattern(regexp = "^(L1|L2|L3)$", message = "Current skill level must be L1, L2, or L3") String currentSkillLevel,
        @Size(max = 255) String currentOrganization,
        @Size(max = 255) String qualification,
        @Size(max = 255) String fatherName) {
}
