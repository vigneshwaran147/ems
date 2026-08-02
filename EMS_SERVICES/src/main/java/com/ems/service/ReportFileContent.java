package com.ems.service;

import com.ems.enums.ReportFormat;

public record ReportFileContent(
        byte[] content,
        String contentType,
        String fileName) {

    public static ReportFileContent of(byte[] content, ReportFormat format, String baseName) {
        return switch (format) {
            case PDF -> new ReportFileContent(content, "application/pdf", baseName + ".pdf");
            case EXCEL -> new ReportFileContent(content,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    baseName + ".xlsx");
            case CSV -> new ReportFileContent(content, "text/csv; charset=UTF-8", baseName + ".csv");
        };
    }
}
