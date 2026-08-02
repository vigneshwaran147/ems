package com.ems.service;

import org.springframework.core.io.Resource;

public record ProfilePhotoContent(
        Resource resource,
        String contentType,
        String storageKey) {
}
