package com.ems.dto.request;

import com.ems.enums.ViolationType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Payload posted by the client-side proctoring pipeline to
 * {@code POST /api/proctor/log-violation}.
 *
 * <p><strong>Trust model:</strong> {@code studentId} is echoed by the browser but is
 * never trusted. The service resolves the owning session from the authenticated
 * principal and rejects the request if {@code studentId} does not match the caller.
 * The field is retained because it lets the server detect a mismatch (a tampered
 * client or a hijacked session) rather than silently accepting the write.</p>
 *
 * @param examId        numeric id of the exam being attempted
 * @param studentId     candidate business id (e.g. {@code EMS0007}); must match the caller
 * @param violationType detection emitted by the worker or a security listener
 * @param evidenceImage optional base64 webcam frame, with or without a {@code data:} URI prefix
 * @param description   optional human-readable detail for the invigilator timeline
 * @param confidence    optional model confidence in {@code [0,1]} for CV detections
 */
public record ViolationRequestDTO(

        @NotNull(message = "examId is required")
        @Positive(message = "examId must be positive")
        Long examId,

        @NotBlank(message = "studentId is required")
        @Size(max = 50, message = "studentId must not exceed 50 characters")
        String studentId,

        @NotNull(message = "violationType is required")
        ViolationType violationType,

        /*
         * A 320x240 JPEG at quality 0.5 lands around 8-15 KB raw, ~11-20 KB once
         * base64 expands it by 4/3. The 2 MB ceiling is a deliberately generous
         * abuse guard, not an expected size.
         */
        @Size(max = 2_000_000, message = "evidenceImage exceeds the 2MB capture limit")
        String evidenceImage,

        @Size(max = 4000, message = "description must not exceed 4000 characters")
        String description,

        Double confidence) {

    /** Normalises the payload so downstream code never sees blank-vs-null ambiguity. */
    public ViolationRequestDTO {
        studentId = studentId == null ? null : studentId.trim();
        evidenceImage = (evidenceImage == null || evidenceImage.isBlank()) ? null : evidenceImage.trim();
        description = (description == null || description.isBlank()) ? null : description.trim();
    }

    public boolean hasEvidence() {
        return evidenceImage != null;
    }
}
