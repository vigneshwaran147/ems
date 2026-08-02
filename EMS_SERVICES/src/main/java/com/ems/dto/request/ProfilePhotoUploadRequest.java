package com.ems.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ProfilePhotoUploadRequest(@NotBlank String profilePhoto) {
}
