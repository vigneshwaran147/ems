package com.ems.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ems.enums.ReportFormat;
import com.ems.service.ReportFileContent;
import com.ems.service.ReportService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping({ "/api/reports", "/api/admin/reports" })
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/users")
    public ResponseEntity<byte[]> userReport(@RequestParam(defaultValue = "PDF") ReportFormat format) {
        return download(reportService.userReport(format));
    }

    @GetMapping("/exams")
    public ResponseEntity<byte[]> examReport(@RequestParam(defaultValue = "PDF") ReportFormat format) {
        return download(reportService.examReport(format));
    }

    @GetMapping("/revenue")
    public ResponseEntity<byte[]> revenueReport(@RequestParam(defaultValue = "PDF") ReportFormat format) {
        return download(reportService.revenueReport(format));
    }

    @GetMapping("/certifications")
    public ResponseEntity<byte[]> certificationReport(@RequestParam(defaultValue = "PDF") ReportFormat format) {
        return download(reportService.certificationReport(format));
    }

    @GetMapping("/results")
    public ResponseEntity<byte[]> resultReport(@RequestParam(defaultValue = "PDF") ReportFormat format) {
        return download(reportService.resultReport(format));
    }

    @GetMapping("/violations")
    public ResponseEntity<byte[]> violationReport(@RequestParam(defaultValue = "PDF") ReportFormat format) {
        return download(reportService.violationReport(format));
    }

    private ResponseEntity<byte[]> download(ReportFileContent content) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + content.fileName() + "\"")
                .body(content.content());
    }
}
