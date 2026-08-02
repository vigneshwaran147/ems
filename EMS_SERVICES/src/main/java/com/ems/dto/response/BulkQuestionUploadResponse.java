package com.ems.dto.response;

import java.util.List;

public record BulkQuestionUploadResponse(
        int totalRows,
        int importedRows,
        int failedRows,
        List<String> errors) {
}
