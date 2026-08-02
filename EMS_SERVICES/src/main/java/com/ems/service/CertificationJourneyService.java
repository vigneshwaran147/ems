package com.ems.service;

import com.ems.dto.request.CertificationApplicationRequest;
import com.ems.dto.request.CertificationCompletionRequest;
import com.ems.dto.response.CertificationApplicationResponse;
import com.ems.dto.response.CertificationEligibilityResponse;
import com.ems.dto.response.CertificationJourneyHistoryResponse;
import com.ems.enums.CertificationLevel;

public interface CertificationJourneyService {

    CertificationEligibilityResponse getEligibility(String email, CertificationLevel requestedLevel);

    CertificationApplicationResponse apply(String email, CertificationApplicationRequest request);

    CertificationApplicationResponse completeApplication(Long applicationId,
            CertificationCompletionRequest request);

    CertificationJourneyHistoryResponse getHistory(String email);
}
