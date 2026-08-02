package com.ems.service;

import org.springframework.core.io.Resource;

public record CertificateFileContent(
        Resource resource,
        String contentType,
        String fileName) {
}
