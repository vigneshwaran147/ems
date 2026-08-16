package com.ems.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.ems.enums.PaymentStatus;
import com.ems.service.PaymentReceiptPdfGeneratorService.PaymentReceiptData;

class PdfBoxPaymentReceiptPdfGeneratorServiceTest {

    /**
     * Set {@code -Dreceipt.dump.dir=/some/path} to also write the rendered PDFs
     * to disk for visual review.
     */
    private static final String DUMP_DIR_PROPERTY = "receipt.dump.dir";

    private final PdfBoxPaymentReceiptPdfGeneratorService generator =
            new PdfBoxPaymentReceiptPdfGeneratorService();

    @Test
    void printsEveryFigureTheReceiptClaims() throws IOException {
        byte[] pdf = generator.generateReceiptPdf(sample(PaymentStatus.SUCCESS));

        dumpIfRequested("receipt_success.pdf", pdf);

        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");

        // Squashed comparison: the small-caps lines carry extra character
        // spacing, which text extraction reports as gaps between letters.
        String text = squash(extractText(pdf));
        assertThat(text)
                .contains(squash("TXN-2026-0091"))
                .contains(squash("Priya Raghunathan"))
                .contains(squash("priya@example.com"))
                .contains(squash("EMS-2026-0042"))
                .contains(squash("Level 3 certification exam application fee"))
                .contains(squash("INR 2,499.00"))
                .contains(squash("RAZORPAY"))
                .contains(squash("pay_MN71ka92"))
                .contains(squash("PAYMENT RECEIPT"));
    }

    /**
     * A settled payment is the only one that may read as "PAID"; anything else
     * must print its own status so the page is never mistaken for proof of a
     * completed purchase.
     */
    @ParameterizedTest
    @EnumSource(value = PaymentStatus.class, names = { "SUCCESS", "REFUNDED", "FAILED" })
    void statesTheStatusItWasGiven(PaymentStatus status) throws IOException {
        byte[] pdf = generator.generateReceiptPdf(sample(status));

        dumpIfRequested("receipt_" + status.name().toLowerCase() + ".pdf", pdf);

        String text = squash(extractText(pdf));
        if (status == PaymentStatus.SUCCESS) {
            assertThat(text).contains("PAID");
        } else {
            assertThat(text).contains(status.name()).doesNotContain("PAID");
        }
    }

    @Test
    void rendersWhenTheOptionalProviderDetailsAreMissing() throws IOException {
        PaymentReceiptData data = new PaymentReceiptData(
                "TXN-2026-0100", "Priya Raghunathan", "EMS-2026-0042", "priya@example.com",
                "Level 1 certification exam fee", BigDecimal.valueOf(999), "INR",
                null, null, PaymentStatus.SUCCESS, Instant.parse("2026-07-02T09:15:00Z"));

        String text = squash(extractText(generator.generateReceiptPdf(data)));

        assertThat(text).contains(squash("INR 999.00"));
    }

    private static PaymentReceiptData sample(PaymentStatus status) {
        return new PaymentReceiptData(
                "TXN-2026-0091",
                "Priya Raghunathan",
                "EMS-2026-0042",
                "priya@example.com",
                "Level 3 certification exam application fee",
                BigDecimal.valueOf(2499),
                "INR",
                "RAZORPAY",
                "pay_MN71ka92",
                status,
                Instant.parse("2026-08-10T11:30:00Z"));
    }

    private static String extractText(byte[] pdf) throws IOException {
        try (PDDocument document = PDDocument.load(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }

    /** Strips all whitespace so letter-spaced text can be matched by content. */
    private static String squash(String value) {
        return value.replaceAll("\\s+", "");
    }

    private static void dumpIfRequested(String fileName, byte[] pdf) throws IOException {
        String dir = System.getProperty(DUMP_DIR_PROPERTY);
        if (dir == null || dir.isBlank()) {
            return;
        }
        Path target = Paths.get(dir);
        Files.createDirectories(target);
        Files.write(target.resolve(fileName), pdf);
    }
}
