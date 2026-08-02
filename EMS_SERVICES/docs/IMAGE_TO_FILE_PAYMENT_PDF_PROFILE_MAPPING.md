# Image to File Service Mapping (Payment + PDF + Profile Photo, Best-Effort OCR)

Source: provided screenshots showing the following files:
- `PaymentServiceImpl.java`
- `PdfBoxCertificatePdfGeneratorService.java`
- `LocalProfilePhotoStorageService.java`

Mapped files:
- src/main/java/com/ems/service/impl/PaymentServiceImpl.java
- src/main/java/com/ems/service/impl/PdfBoxCertificatePdfGeneratorService.java
- src/main/java/com/ems/service/impl/LocalProfilePhotoStorageService.java

## 1) PaymentServiceImpl.java
Extracted structure reflected in implementation:
- Class annotations: `@Slf4j`, `@Service`, `@ConditionalOnProperty`, `@Transactional`
- Level fee constants: L1, L2, L3
- Constructor wiring of strategy map from `List<PaymentProviderStrategy>`

Methods from screenshots and implemented:
- `initiatePayment(...)`
- `verifyPayment(...)`
- `refundPayment(...)`
- `getPaymentHistory(...)`
- helpers: `strategy(...)`, `parseProvider(...)`, `resolveAmountByLevel(...)`, `findUser(...)`, `findApplication(...)`, `toResponse(...)`

Behavior mirrored:
- Validates app/exam/payment state before initiating.
- Parses provider (`UPI` alias maps to `UPI_QR`).
- Updates both `Payment` and linked `CertificationApplication` statuses.
- Allows refunds only for successful payments.

## 2) PdfBoxCertificatePdfGeneratorService.java
Extracted structure reflected in implementation:
- Uses PDFBox (`PDDocument`, `PDPage`, `PDPageContentStream`, `PDType1Font`, `LosslessFactory`, `PDImageXObject`)
- Writes core certificate text lines and draws QR image.
- Throws `BusinessException` with `INTERNAL_SERVER_ERROR` on generation failure.

Methods implemented:
- `generateCertificatePdf(CertificatePdfData data)`
- helper `writeLine(...)`

## 3) LocalProfilePhotoStorageService.java
Extracted structure reflected in implementation:
- Supports base64 data URL parsing and validation.
- Supports JPEG/PNG/WEBP detection by magic bytes.
- Enforces max size and dimension bounds.
- Stores files under configured local storage directory.

Methods implemented:
- `storeProfilePhoto(...)`
- `loadProfilePhoto(...)`
- `deleteProfilePhoto(...)`
- `isStoredReference(...)`
- `resolveAccessUrl(...)`
- helpers for parse/validate, content-type detection, dimensions, fallback by file extension.

Note: OCR extraction was best-effort from photos and then aligned to existing project contracts for compile-safe code.
