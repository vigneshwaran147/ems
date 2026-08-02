# Image to File Service Mapping (Certificate + Journey, Best-Effort OCR)

Source: provided screenshots showing `CertificateServiceImpl.java` and `CertificationJourneyServiceImpl.java`.

## Mapped files
- src/main/java/com/ems/service/impl/CertificateServiceImpl.java
- src/main/java/com/ems/service/impl/CertificationJourneyServiceImpl.java

## 1) CertificateServiceImpl.java (extracted structure)
- Class annotations: `@Slf4j`, `@Service`, `@RequiredArgsConstructor`, `@ConditionalOnProperty`, `@Transactional`
- Core dependencies: `CertificateRepository`, `CertificationRepository`, `ExamAttemptRepository`, `UserRepository`, `CertificatePdfGeneratorService`
- Config fields:
  - `app.storage.certificate.directory` -> `certificateStorageDirectory`
  - `app.certificate.verification-base-url` -> `verificationBaseUrl`

Visible methods transcribed from screenshots:
- `generateForSession(String email, Long sessionId)`
- `getMyCertificates(String email)`
- `getMyCertificate(String email, String certificateNumber)`
- `verify(String certificateNumber)` with `VALID/EXPIRED/INVALID`
- `downloadMyCertificate(String email, String certificateNumber)`
- `downloadCertificateForAdmin(String certificateNumber)`
- `generateMissingCertificates(String email)`
- `regenerateMissingPdfFiles(String email)`
- `diagnoseCertificatesForUser(String email)`

Visible helper methods:
- `loadCertificateFile(...)`
- `getOrCreateCertification(...)`
- `generateCertificateNumber(...)`
- `buildVerificationUrl(...)`
- `buildQrCodePng(...)`
- `storePdf(...)`
- `toResponse(...)`
- `candidateName(...)`

Notable behaviors reflected:
- PASS-only certificate generation.
- Reuse existing certificate for same attempt.
- PDF generation and storage in certificate directory.
- QR code generation through ZXing.
- Verification status based on expiry date.
- Recovery/diagnostics maps for missing certificates and missing PDFs.

## 2) CertificationJourneyServiceImpl.java (extracted structure)
- Class annotations: `@Slf4j`, `@Service`, `@RequiredArgsConstructor`, `@ConditionalOnProperty`, `@Transactional`
- Dependencies: `UserRepository`, `CertificationRepository`, `CertificationApplicationRepository`, `CertificationHistoryRepository`
- Open statuses set includes: `APPLIED`, `ELIGIBLE`, `IN_PROGRESS`

Visible methods transcribed from screenshots:
- `getEligibility(String email, CertificationLevel requestedLevel)`
- `apply(String email, CertificationApplicationRequest request)`
- `completeApplication(Long applicationId, CertificationCompletionRequest request)`
- `getHistory(String email)`

Visible helpers:
- `determineEligibility(...)`
- `evaluateSequentialEligibility(...)`
- `issueCertification(...)`
- `findUserByEmail(...)`
- `toApplicationResponse(...)`
- `toCertificationSummary(...)`
- `toHistoryEvent(...)`

Notable behaviors reflected:
- L1 always eligible.
- L2/L3 eligibility gated by prerequisite level (L1/L2) certification state.
- Blocks duplicate open applications for same level.
- Completion with `passed=true` issues certification + history event.
- Journey history bundles applications, certifications, and event timeline.

Note: OCR was best-effort from screenshots; implementation was aligned to existing workspace types and repository contracts.
