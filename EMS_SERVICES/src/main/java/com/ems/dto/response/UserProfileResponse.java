package com.ems.dto.response;

public record UserProfileResponse(
        String userId,
        String firstName,
        String lastName,
        String email,
        String mobileNumber,
        String profilePhotoUrl,
        String address,
        Integer yearsOfExperience,
        String currentSkillLevel,
        String currentOrganization,
        String qualification,
        String fatherName) {
}
