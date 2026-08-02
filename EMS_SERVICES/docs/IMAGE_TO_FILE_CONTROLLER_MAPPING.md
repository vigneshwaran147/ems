# Image to File Controller Mapping (Best-Effort OCR)

Source: provided screenshots of `last5_controllers.txt`.

Note: This is a best-effort manual OCR transcription from photos. A few tokens may differ slightly from the original image due to blur/reflections.

## 1) com/ems/controller/ProctoringController.java
Mapped workspace file: src/main/java/com/ems/controller/ProctoringController.java

Visible structure and methods from images:
- `@RestController`
- `@RequestMapping("/api/proctoring")`
- `@RequiredArgsConstructor`
- `@Validated`
- `@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)`
- `private final ProctoringService proctoringService;`

Methods shown:
1. `@PostMapping("/sessions/{sessionId}/recordings")`
   - `recordVideoMetadata(Authentication authentication, @PathVariable Long sessionId, @Valid @RequestBody RecordingMetadataRequest request)`
   - Response message in image: "Recording metadata saved successfully"

2. `@PostMapping("/sessions/{sessionId}/violations")`
   - `reportViolation(Authentication authentication, @PathVariable Long sessionId, @Valid @RequestBody ViolationReportRequest request)`
   - Response message in image: "Violation reported successfully"

3. `@GetMapping("/sessions/{sessionId}/violations")`
   - `getSessionViolations(Authentication authentication, @PathVariable Long sessionId)`
   - Response message in image: "Violation history fetched successfully"

4. `@GetMapping("/sessions/{sessionId}/violations/summary")`
   - `getSessionViolationsSummary(Authentication authentication, @PathVariable Long sessionId)`
   - Response message in image: "Violation summary fetched successfully"

5. `@PatchMapping("/sessions/{sessionId}/monitoring")`
   - `updateMonitoring(Authentication authentication, @PathVariable Long sessionId, @Valid @RequestBody SessionMonitoringUpdateRequest request)`
   - Response message in image: "Session monitoring updated successfully"

6. `@GetMapping("/sessions/{sessionId}")`
   - `getSessionSummary(Authentication authentication, @PathVariable Long sessionId)`
   - Response message in image: "Proctoring session fetched successfully"

7. `@PreAuthorize("hasRole('ADMIN')")`
   `@GetMapping("/sessions/active")`
   - `getActiveSessions()`

8. `@PreAuthorize("hasRole('ADMIN')")`
   `@GetMapping("/sessions/{sessionId}/violations/admin")`
   - `getSessionViolationsForAdmin(@PathVariable Long sessionId)`

9. `@PreAuthorize("hasRole('ADMIN')")`
   `@GetMapping("/sessions/{sessionId}/violations/admin/summary")`
   - `getSessionViolationSummaryForAdmin(@PathVariable Long sessionId)`

10. Helper:
   - `private String requireUser(Authentication authentication)`
   - Throws `new UnauthorizedException("Authentication required")` when null

---

## 2) com/ems/controller/QuestionController.java
Mapped workspace file: src/main/java/com/ems/controller/QuestionController.java

Visible structure and methods from images:
- `@RestController`
- `@RequestMapping("/api/questions")`
- `@RequiredArgsConstructor`
- `@Validated`
- `@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)`
- `@PreAuthorize("hasRole('ADMIN')")`
- `private final QuestionService questionService;`

Methods shown clearly:
1. `@PostMapping`
   - `create(@Valid @RequestBody QuestionUpsertRequest request)`
   - Response message in image: "Question created successfully"

2. `@PutMapping("/{questionId}")`
   - `update(@PathVariable Long questionId, @Valid @RequestBody QuestionUpsertRequest request)`
   - Response message in image: "Question updated successfully"

3. `@DeleteMapping("/{questionId}")`
   - `delete(@PathVariable Long questionId)`
   - Response message in image: "Question deleted successfully"

4. `@GetMapping`
   - `search(@RequestParam(required = false) String questionCode, @RequestParam(required = false) CertificationLevel certificationLevel, @RequestParam(required = false) QuestionSeverity severity, @RequestParam(required = false) Boolean active, @RequestParam(required = false) String searchText)`
   - Response message in image: "Questions fetched successfully"

5. `@PostMapping(value = "/bulk-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)`
   - `bulkUpload(@RequestPart("file") MultipartFile file)`
   - Response message in image: "Question bulk upload processed successfully"

Imports visible include:
- `QuestionUpsertRequest`, `BulkQuestionUploadResponse`, `QuestionResponse`, `MessageResponse`
- `CertificationLevel`, `QuestionSeverity`
- `MultipartFile`

---

## 3) com/ems/controller/ReportController.java
Mapped workspace file: src/main/java/com/ems/controller/ReportController.java

Visible structure and methods from images:
- `@RestController`
- `@RequestMapping("/api/admin/reports")` (as shown in screenshot)
- `@RequiredArgsConstructor`
- `@PreAuthorize("hasRole('ADMIN')")`
- `@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)`
- `private final ReportService reportService;`

Methods shown:
1. `@GetMapping("/users")` -> `userReport(@RequestParam(defaultValue = "PDF") ReportFormat format)`
2. `@GetMapping("/exams")` -> `examReport(@RequestParam(defaultValue = "PDF") ReportFormat format)`
3. `@GetMapping("/revenue")` -> `revenueReport(@RequestParam(defaultValue = "PDF") ReportFormat format)`
4. `@GetMapping("/certifications")` -> `certificationReport(@RequestParam(defaultValue = "PDF") ReportFormat format)`
5. `@GetMapping("/results")` -> `resultReport(@RequestParam(defaultValue = "PDF") ReportFormat format)`
6. `@GetMapping("/violations")` -> `violationReport(@RequestParam(defaultValue = "PDF") ReportFormat format)`
7. Helper method:
   - `private ResponseEntity<ByteArrayResource> download(ReportFileContent content)`
   - sets `CONTENT_TYPE`, `CONTENT_DISPOSITION`, body from `content.content()`

---

## 4) com/ems/controller/ResultEvaluationController.java
Mapped workspace file: src/main/java/com/ems/controller/ResultEvaluationController.java

Visible structure and methods from images:
- `@RestController`
- `@RequestMapping("/api/results")`
- `@RequiredArgsConstructor`
- `@Validated`
- `@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)`
- `private final ResultEvaluationService resultEvaluationService;`

Methods shown:
1. `@PostMapping("/sessions/{sessionId}/evaluate")`
   - `evaluateResult(Authentication authentication, @PathVariable Long sessionId, @Valid @RequestBody ExamResultSubmissionRequest request)`
   - Response message in image: "Result evaluated successfully"

2. `@GetMapping("/sessions/{sessionId}")`
   - `getResult(Authentication authentication, @PathVariable Long sessionId)`
   - Response message in image: "Result fetched successfully"

3. `@GetMapping("/me")`
   - `getMyResults(Authentication authentication)`
   - Response message in image: "Results fetched successfully"

4. `@PreAuthorize("hasRole('ADMIN')")`
   `@GetMapping("/sessions/{sessionId}/admin")`
   - `getResultForAdmin(@PathVariable Long sessionId)`
   - Response message in image: "Result fetched successfully"

5. Helper:
   - `private String requireUser(Authentication authentication)`
   - Throws `new UnauthorizedException("Authentication required")` when null

---

## 5) com/ems/controller/UserProfileController.java
Mapped workspace file: src/main/java/com/ems/controller/UserProfileController.java

Visible structure and methods from images:
- `@RestController`
- `@RequestMapping("/api/users")`
- `@RequiredArgsConstructor`
- `@Validated`
- `private final UserProfileService userProfileService;`

Methods shown:
1. `@PostMapping("/register")`
   - `register(@Valid @RequestBody UserRegistrationRequest request)`
   - Response message in image: "User registered successfully"

2. `@GetMapping("/profile")`
   - `getCurrentProfile(Authentication authentication)`
   - Response message in image: "User profile fetched successfully"

3. `@PutMapping("/profile")`
   - `updateCurrentProfile(Authentication authentication, @Valid @RequestBody UpdateUserProfileRequest request)`
   - Response message in image: "User profile updated successfully"

4. `@GetMapping("/profile/photo")`
   - `getCurrentProfilePhoto(Authentication authentication)`
   - Loads `ProfilePhotoContent` and sets media type/cache control on response

5. `@PostMapping("/profile/photo")`
   - `uploadProfilePhoto(Authentication authentication, @Valid @RequestBody ProfilePhotoUploadRequest request)`
   - Response message in image: "Profile photo uploaded successfully"

Imports visible include:
- `Resource`, `HttpHeaders`, `MediaType`, `Authentication`
- `ProfilePhotoUploadRequest`, `UpdateUserProfileRequest`, `UserRegistrationRequest`
- `UserProfileResponse`, `ProfilePhotoContent`, `UserProfileService`, `CorrelationIdUtil`
