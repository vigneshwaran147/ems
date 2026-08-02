# Image to File Service Mapping (Batch 2, Best-Effort OCR)

Source: provided screenshots for service implementation files.

Mapped files populated:
- src/main/java/com/ems/service/impl/UserProfileServiceImpl.java
- src/main/java/com/ems/service/impl/ResultEvaluationServiceImpl.java
- src/main/java/com/ems/service/impl/QuestionServiceImpl.java
- src/main/java/com/ems/service/impl/ReportsServiceImpl.java
- src/main/java/com/ems/service/impl/ProctoringServiceImpl.java

## 1) UserProfileServiceImpl
Implemented from screenshot flow:
- register + validation + password policy + default USER role assignment
- get/update current profile
- upload and load current profile photo
- profile photo replacement with previous file cleanup
- response mapper with resolved profile photo URL

## 2) ResultEvaluationServiceImpl
Implemented from screenshot flow:
- evaluate result for active session
- validates selected question set and submitted answers
- computes attempted/correct/wrong, marks, percentage, pass/fail
- writes exam attempt + updates session status and linked application status
- get result, get my results, get result for admin
- helper parsing for selected question IDs and stored correct options JSON
- resolves total marks based on selected question IDs when present

## 3) QuestionServiceImpl
Implemented from screenshot flow:
- create/get/update/delete with cache eviction and ID cache retrieval
- search with cache key based on filter tuple
- strict question-code pattern validation and consistency checks (level/severity)
- option and correct-option integrity validation
- JSON serialize/deserialize options
- bulk CSV upload parser that creates/updates questions row by row

## 4) ReportsServiceImpl
Implemented from screenshot flow:
- user, exam, revenue, certification, result, and violation report generation
- format switch using shared exporters (PDF/EXCEL/CSV)
- cache keys per report type and format
- report content wrapped with ReportFileContent.of(...)

## 5) ProctoringServiceImpl
Implemented from screenshot flow:
- record video metadata for active sessions
- report violation with level progression and auto invalidation at threshold
- user/admin violation list and summary retrieval
- session monitoring update (fingerprint/ip)
- session summary and active sessions list
- helper mappings for violation, summary, and recording responses

Note:
- OCR extraction was best-effort from images and normalized to current project interfaces/repositories for compile-safe code.
- In this repository the report implementation filename is `ReportsServiceImpl.java` (plural).
