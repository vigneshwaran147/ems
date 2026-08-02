package com.ems.service;

import com.ems.dto.request.UpdateUserProfileRequest;
import com.ems.dto.request.UserRegistrationRequest;
import com.ems.dto.response.UserProfileResponse;

public interface UserProfileService {

    UserProfileResponse register(UserRegistrationRequest request);

    UserProfileResponse getCurrentUserProfile(String email);

    UserProfileResponse updateCurrentUserProfile(String email, UpdateUserProfileRequest request);

    UserProfileResponse uploadProfilePhoto(String email, String profilePhoto);

    ProfilePhotoContent loadCurrentUserProfilePhoto(String email);
}
