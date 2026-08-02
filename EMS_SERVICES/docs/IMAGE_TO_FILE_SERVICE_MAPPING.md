# Image to File Service Mapping (Best-Effort OCR)

Source: provided screenshots showing service implementation classes.

Note:
- This is a best-effort manual OCR transcription from photos (blur/reflections may affect exact tokens).
- In the current workspace state, both mapped files exist but are empty.

Mapped files:
- src/main/java/com/ems/service/impl/AdminPortalServiceImpl.java
- src/main/java/com/ems/service/impl/AuthenticationServiceImpl.java

---

## 1) com/ems/service/impl/AdminPortalServiceImpl.java
Mapped workspace file: src/main/java/com/ems/service/impl/AdminPortalServiceImpl.java

Visible class-level structure from images:
- package: `com.ems.service.impl`
- `@Slf4j`
- `@Service`
- `@RequiredArgsConstructor`
- `@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)`
- `@Transactional(readOnly = true)`
- `public class AdminPortalServiceImpl implements AdminPortalService`

Visible injected fields (best-effort):
- `UserRepository userRepository`
- `PaymentRepository paymentRepository`
- `CertificationRepository certificationRepository`
- `CertificationApplicationRepository certificationApplicationRepository`
- `ViolationRepository violationRepository`
- `VideoRecordingRepository videoRecordingRepository`
- `ExamSessionRepository examSessionRepository`
- `QuestionService questionService`
- `CertificateService certificateService`

Visible method blocks from images:

### Users
1. `searchUsers(String searchText, Boolean enabled)`
   - returns `userRepository.adminSearch(searchText, enabled).stream().map(this::toAdminUserResponse).toList();`

2. `getUserById(Long id)`
   - returns `toAdminUserResponse(findUser(id));`

3. `@Transactional`
   `@CacheEvict(cacheNames = {"reports", "dashboard"}, allEntries = true)`
   `setUserEnabled(Long id, boolean enabled)`
   - finds user, sets enabled, saves user, logs update, returns mapped response.

4. `@Transactional`
   `@CacheEvict(cacheNames = {"reports", "dashboard"}, allEntries = true)`
   `setUserLocked(Long id, boolean locked)`
   - finds user, sets account non-locked/locked state, saves user, logs update.

### Questions
5. `searchQuestions(String questionCode, CertificationLevel level, QuestionSeverity severity, Boolean active, String searchText)`
   - delegates to `questionService.search(...)`.

### Payments
6. `getAllPayments()`
   - returns `paymentRepository.findAllByOrderByCreatedDateDesc().stream().map(this::toPaymentResponse).toList();`

### Certification Applications / Certifications
7. `getAllApplications()`
   - maps `certificationApplicationRepository.findAll()` to `CertificationApplicationResponse`.

8. `getAllCertifications()`
   - maps `certificationRepository.findAll()` to `CertificationSummaryResponse`.

### Certificates
9. `getAllCertificates()`
   - maps `certificateRepository.findAll()` to `CertificateResponse` including fields such as certificate number, candidate name, issue/expiry date, verification URL, and admin download URL path.

10. `verifyCertificate(String certificateNumber)`
   - delegates to `certificateService.verify(certificateNumber)`.

### Violations
11. `getAllViolations()`
   - uses `violationRepository.findAllByOrderByDetectedAtDesc().stream().map(this::toViolationResponse).toList();`

12. `getViolationsForSession(Long sessionId)`
   - finds session and returns `violationRepository.findByExamSessionOrderByDetectedAtDesc(session).stream().map(this::toViolationResponse).toList();`

### Recordings
13. `getAllRecordings()`
   - uses `videoRecordingRepository.findAllByOrderByRecordingStartTimeDesc().stream().map(this::toRecordingResponse).toList();`

14. `getRecordingsForSession(Long sessionId)`
   - finds session and returns `videoRecordingRepository.findByExamSessionOrderByRecordingStartTimeDesc(session).stream().map(this::toRecordingResponse).toList();`

### Helpers visible
15. `findUser(Long id)`
   - `userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));`

16. `findSession(Long sessionId)`
   - `examSessionRepository.findById(sessionId).orElseThrow(() -> new ResourceNotFoundException("Exam session not found"));`

17. `toAdminUserResponse(User user)`
   - maps key user profile/account fields (id, userId, first/last name, email, mobile, skills, qualification, years, enabled, account lock state).

18. `toPaymentResponse(Payment payment)`
   - maps transaction/payment fields including amount, currency, provider, status, payment date, provider reference.

19. `toViolationResponse(Violation violation)`
   - includes message derived from action taken:
     - when `EXAM_TERMINATED`: "3rd violation detected. Exam terminated automatically."
     - default: "Violation recorded. Warning issued to candidate."
   - maps flag whether action is terminated.

20. `toRecordingResponse(VideoRecording recording)`
   - maps recording id/session id/file location/start-end time/duration seconds.

---

## 2) com/ems/service/impl/AuthenticationServiceImpl.java
Mapped workspace file: src/main/java/com/ems/service/impl/AuthenticationServiceImpl.java

Visible class-level structure from images:
- package: `com.ems.service.impl`
- `@Slf4j`
- `@Service`
- `@RequiredArgsConstructor`
- `@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)`
- `@Transactional`
- `public class AuthenticationServiceImpl implements AuthenticationService`

Visible injected fields (best-effort):
- `UserRepository userRepository`
- `RoleRepository roleRepository`
- `RefreshTokenRepository refreshTokenRepository`
- `PasswordResetTokenRepository passwordResetTokenRepository`
- `AuthenticationManager authenticationManager`
- `PasswordEncoder passwordEncoder`
- `JwtTokenProvider jwtTokenProvider`
- `JwtProperties jwtProperties`
- `PasswordPolicyValidator passwordPolicyValidator`
- `ProfilePhotoStorageService profilePhotoStorageService`

Visible method blocks from images:

1. `register(RegisterRequest request)`
   - validates registration and password policy.
   - fetches USER role.
   - stores profile photo and builds/saves user with normalized fields.
   - logs registration success.
   - returns issued tokens.

2. `login(LoginRequest request)`
   - normalizes email.
   - authenticates using `authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()))`.
   - on `BadCredentialsException` throws unauthorized error "Invalid email or password".
   - loads user by email ignore-case and checks enabled/unlocked status.
   - revokes active refresh tokens and returns newly issued tokens.

3. `refreshToken(RefreshTokenRequest request)`
   - validates refresh token format (`jwtTokenProvider.validateToken` and refresh-token checks).
   - hashes token (`TokenHashUtil.sha256Hex`).
   - fetches persisted token not revoked, checks expiry, handles revoked/expired states.
   - marks token revoked when needed and saves.
   - returns newly issued tokens for token owner.

4. `logout(LogoutRequest request)`
   - hashes refresh token and revokes by token hash.
   - logs if updated count > 0.
   - returns message response: "Logged out successfully".

5. `forgotPassword(ForgotPasswordRequest request)`
   - lookup by normalized email.
   - if present: generates raw reset token (UUID-based), computes hash, sets ~30 minute expiry, saves `PasswordResetToken`, logs queue/delivery action.
   - always returns generic success response:
     - "If the email exists, password reset instructions have been initiated."

6. `resetPassword(ResetPasswordRequest request)`
   - validates new password policy.
   - token hash lookup for unused token.
   - checks expiry; throws unauthorized on invalid/expired token.
   - updates user password hash and saves user.
   - marks reset token used and saves token.
   - revokes user's active refresh tokens.
   - logs completion and returns message: "Password reset successful".

7. `changePassword(String currentUserEmail, ChangePasswordRequest request)`
   - visible start of method in screenshots; performs user lookup and change-password flow (rest not fully visible in images).

Likely helpers/flows visible by imports and code snippets:
- token issuance helper (e.g., `issueTokens(user)`)
- refresh-token persistence/revocation helpers
- registration validation helper

