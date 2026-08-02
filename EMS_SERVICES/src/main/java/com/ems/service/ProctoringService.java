package com.ems.service;

import java.util.List;

import com.ems.dto.request.RecordingMetadataRequest;
import com.ems.dto.request.SessionMonitoringUpdateRequest;
import com.ems.dto.request.ViolationReportRequest;
import com.ems.dto.response.ProctoringSessionResponse;
import com.ems.dto.response.VideoRecordingResponse;
import com.ems.dto.response.ViolationResponse;
import com.ems.dto.response.ViolationSummaryResponse;

public interface ProctoringService {

    VideoRecordingResponse recordVideoMetadata(String email, Long sessionId,
            RecordingMetadataRequest request);

    ViolationResponse reportViolation(String email, Long sessionId, ViolationReportRequest request);

    List<ViolationResponse> getSessionViolations(String email, Long sessionId);

    ViolationSummaryResponse getSessionViolationSummary(String email, Long sessionId);

    List<ViolationResponse> getSessionViolationsForAdmin(Long sessionId);

    ViolationSummaryResponse getSessionViolationSummaryForAdmin(Long sessionId);

    ProctoringSessionResponse updateSessionMonitoring(String email, Long sessionId,
            SessionMonitoringUpdateRequest request);

    ProctoringSessionResponse getSessionSummary(String email, Long sessionId);

    List<ProctoringSessionResponse> getActiveSessions();
}
