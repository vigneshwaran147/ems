package com.ems.service;

import java.util.List;

import com.ems.dto.request.ExamResultSubmissionRequest;
import com.ems.dto.response.ExamResultResponse;

public interface ResultEvaluationService {

    ExamResultResponse evaluateResult(String email, Long sessionId, ExamResultSubmissionRequest request);

    ExamResultResponse getResult(String email, Long sessionId);

    List<ExamResultResponse> getMyResults(String email);

    ExamResultResponse getResultForAdmin(Long sessionId);
}
