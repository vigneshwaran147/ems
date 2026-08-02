# Image to File Service Mapping (Exam + Dashboard, Best-Effort OCR)

Source: provided screenshots showing ExamServiceImpl.java and DashboardServiceImpl.java.

Mapped files:
- src/main/java/com/ems/service/impl/ExamServiceImpl.java
- src/main/java/com/ems/service/impl/DashboardServiceImpl.java

## 1) ExamServiceImpl.java
Visible structure and behavior extracted:
- Class annotations: @Slf4j, @Service, @RequiredArgsConstructor, @ConditionalOnProperty, @Transactional
- Injected dependency: ExamRepository

Visible methods from screenshots:
- create(ExamUpsertRequest request)
- update(Long examId, ExamUpsertRequest request)
- delete(Long examId)
- publish(Long examId)
- schedule(Long examId, ExamScheduleRequest request)
- updateDuration(Long examId, ExamDurationUpdateRequest request)
- updatePassingMarks(Long examId, ExamPassingMarksUpdateRequest request)
- search(String examCode, String examName, CertificationLevel certificationLevel, ExamStatus examStatus, Boolean published)

Visible helper methods:
- findExam(Long examId)
- validateRequest(ExamUpsertRequest request)
- toResponse(Exam exam)

Notable screenshot logic reflected:
- Exam code uniqueness check on create/update.
- Create defaults: examStatus=SCHEDULED, published=false.
- Schedule enforces end time > start time.
- Passing percentage validation capped at 100.
- Response maps created/updated audit timestamps.

## 2) DashboardServiceImpl.java
Visible structure and behavior extracted:
- Class annotations: @Service, @RequiredArgsConstructor, @ConditionalOnProperty, @Transactional(readOnly=true)
- Injected dependencies: UserRepository, CertificationRepository, CertificationApplicationRepository

Visible method from screenshots:
- getCurrentUserDashboard(String email)

Visible helper method:
- toCertificationSummary(Certification certification)

Notable screenshot logic reflected:
- Finds user by email or throws ResourceNotFoundException.
- Loads certifications and splits active/history lists.
- Loads certification applications and maps exam status cards.
- Counts failed and passed applications from application statuses.
- Counts expired certifications from certification statuses.
- Builds UserDashboardResponse with profile photo URL fallback to /api/users/profile/photo.

Note: transcription is best-effort from photos and aligned to current repository signatures for compile-safe implementation.
