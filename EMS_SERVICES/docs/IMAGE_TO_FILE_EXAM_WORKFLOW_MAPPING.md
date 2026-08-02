# Image to File Service Mapping (Exam Workflow, Best-Effort OCR)

Source: provided screenshots for `ExamWorkflowServiceImpl.java`.

Mapped file:
- src/main/java/com/ems/service/impl/ExamWorkflowServiceImpl.java

## Extracted structure from images
- Class annotations: `@Slf4j`, `@Service`, `@RequiredArgsConstructor`, `@ConditionalOnProperty`, `@Transactional`
- Constants:
  - `TOTAL_QUESTIONS = 30`
  - `COUNT_LOW = 6`
  - `COUNT_MEDIUM = 12`
  - `COUNT_HIGH = 12`
- Dependencies:
  - `CertificationJourneyService`
  - `CertificationApplicationRepository`
  - `CertificationRepository`
  - `UserRepository`
  - `ExamRepository`
  - `QuestionRepository`
  - `ExamSessionRepository`
  - `PaymentService`
  - `ObjectMapper`

## Methods transcribed and implemented
- `getWorkflowOptions(String email, CertificationLevel certificationLevel)`
- `createApplication(String email, ExamWorkflowApplicationRequest request)`
- `initiatePayment(String email, Long applicationId, PaymentInitiationRequest request)`
- `completePayment(String email, Long applicationId, PaymentCompletionRequest request)`
- `scheduleExam(String email, Long applicationId, WorkflowExamScheduleRequest request)`
- `startExam(String email, Long applicationId, ExamStartRequest request)`
- `getSessionQuestion(String email, UUID sessionToken, int questionNumber)`
- `reApply(String email, Long failedApplicationId)`
- `getReApplyableApplications(String email)`

## Helper methods transcribed and implemented
- `toWorkflowApplicationResponse(application)` and overloaded variant with `canReApply`
- `toQuestionPayload(Question question)`
- `parseQuestionType(String questionType)`
- `readStringList(String rawJson)`
- `readLongList(String rawJson)`
- `writeLongList(List<Long> values)`
- `buildProportionalQuestionSet(CertificationLevel level)`
- `pickSeverity(CertificationLevel level, QuestionSeverity severity, int count)`
- `findUser(String email)`
- `findApplication(String email, Long applicationId)`
- `evaluateStartReadinessIssue(CertificationApplication application)`

## Key behavior reflected from screenshots
- Severity-based fixed question distribution (6 LOW, 12 MEDIUM, 12 HIGH).
- Session question IDs persisted as JSON in `selectedQuestionIdsJson`.
- `getSessionQuestion` is 1-indexed and validates bounds.
- Re-apply allowed only for `FAILED`, `EXPIRED`, `REJECTED` with eligibility + open-application guard.
- Re-apply may clear exam link when original exam is unusable (not published or not scheduled).
- Payment completion verifies the latest application payment transaction.

Note: This is best-effort OCR-aligned reconstruction from photos and adjusted to current repository contracts for compile safety.
