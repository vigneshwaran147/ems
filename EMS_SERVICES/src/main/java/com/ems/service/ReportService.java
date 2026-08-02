package com.ems.service;

import com.ems.enums.ReportFormat;

public interface ReportService {

    ReportFileContent userReport(ReportFormat format);

    ReportFileContent examReport(ReportFormat format);

    ReportFileContent revenueReport(ReportFormat format);

    ReportFileContent certificationReport(ReportFormat format);

    ReportFileContent resultReport(ReportFormat format);

    ReportFileContent violationReport(ReportFormat format);
}
