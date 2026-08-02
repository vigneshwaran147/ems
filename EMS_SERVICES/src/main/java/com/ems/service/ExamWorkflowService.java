package com.ems.service;

import java.util.List;
import java.util.UUID;

import com.ems.dto.request.ExamStartRequest;
import com.ems.dto.request.ExamWorkflowApplicationRequest;
import com.ems.dto.request.PaymentCompletionRequest;
import com.ems.dto.request.PaymentInitiationRequest;
import com.ems.dto.request.WorkflowExamScheduleRequest;
import com.ems.dto.response.ExamSessionQuestionResponse;
import com.ems.dto.response.ExamStartResponse;
import com.ems.dto.response.ExamWorkflowApplicationResponse;
import com.ems.dto.response.PaymentResponse;
import com.ems.dto.response.WorkflowExamOptionResponse;
import com.ems.enums.CertificationLevel;

public interface ExamWorkflowService {

    WorkflowExamOptionResponse getWorkflowOptions(String email, CertificationLevel certificationLevel);

    ExamWorkflowApplicationResponse createApplication(String email,
            ExamWorkflowApplicationRequest request);

    PaymentResponse initiatePayment(String email, Long applicationId,
            PaymentInitiationRequest request);

    PaymentResponse completePayment(String email, Long applicationId,
            PaymentCompletionRequest request);

    ExamWorkflowApplicationResponse scheduleExam(String email, Long applicationId,
            WorkflowExamScheduleRequest request);

    ExamStartResponse startExam(String email, Long applicationId, ExamStartRequest request);

    List<ExamWorkflowApplicationResponse> getReApplyableApplications(String email);

    /** Fetches the full payload for a specific question within an active exam session. {@code questionNumber} is 1-indexed (1..30). */
    ExamSessionQuestionResponse getSessionQuestion(String email, UUID sessionToken, int questionNumber);

    /** Re-applies for the same certification level and exam as a previously FAILED or INVALIDATED application. */
    ExamWorkflowApplicationResponse reApply(String email, Long failedApplicationId);
}
