package com.ems.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import com.ems.enums.CertificationLevel;
import com.ems.service.CertificatePdfGeneratorService;
import com.ems.service.CertificatePdfGeneratorService.CertificatePdfData;
import com.ems.service.CertificateTemplate;

class PdfBoxCertificatePdfGeneratorServiceTest {

    /**
     * Set {@code -Dcertificate.dump.dir=/some/path} to also write the rendered
     * PDFs to disk for visual review.
     */
    private static final String DUMP_DIR_PROPERTY = "certificate.dump.dir";

    private final PdfBoxCertificatePdfGeneratorService generator = new PdfBoxCertificatePdfGeneratorService();

    @ParameterizedTest
    @EnumSource(CertificationLevel.class)
    void rendersTheLevelTemplateOntoTheCertificate(CertificationLevel level) throws IOException {
        CertificateTemplate template = CertificateTemplate.forLevel(level);
        byte[] pdf = generator.generateCertificatePdf(sampleData(level, "Priya Raghunathan"));

        dumpIfRequested(level.name() + "_certificate.pdf", pdf);

        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");

        // Compared with whitespace removed: the small-caps lines are drawn with
        // extra character spacing, which text extraction reports as gaps between
        // letters. The comparison is about which words are on the page.
        String text = squash(extractText(pdf));
        assertThat(text)
                .contains(squash(template.titleLineOne()))
                .contains(squash(template.titleLineTwo()))
                .contains(squash(template.tierLine()))
                .contains(squash(template.eyebrow()))
                .contains(squash("Priya Raghunathan"))
                .contains("CERT-2026-" + level.name() + "-ABCD1234")
                .contains(squash("LEVEL " + template.levelIndex() + " OF " + CertificateTemplate.TOTAL_LEVELS));

        // Every competency the template promises must actually appear.
        template.competencies().forEach(competency -> assertThat(text).contains(squash(competency)));
    }

    @ParameterizedTest
    @EnumSource(CertificationLevel.class)
    void keepsWordSpacingAcrossEmphasisBoundaries(CertificationLevel level) throws IOException {
        // The citation switches to bold mid-sentence. Laying each emphasis run
        // out independently used to swallow the space at the boundary, which
        // printed "...production tasksin accordance..." on a real certificate.
        byte[] pdf = generator.generateCertificatePdf(sampleData(level, "Priya Raghunathan"));

        String text = extractText(pdf).replaceAll("\\s+", " ");
        String citation = CertificateTemplate.forLevel(level).citationText().replaceAll("\\s+", " ");
        assertThat(text).contains(citation);
    }

    @Test
    void keepsALongNameInsideItsRuleByShrinkingTheFont() throws IOException {
        String longName = "Bartholomew Maximilian Featherstonehaugh-Kensington III";
        byte[] pdf = generator.generateCertificatePdf(sampleData(CertificationLevel.L3, longName));

        dumpIfRequested("L3_certificate_long_name.pdf", pdf);

        // Fits at a reduced size, so it is present in full rather than truncated.
        assertThat(squash(extractText(pdf))).contains(squash(longName));
    }

    @Test
    void truncatesANameTooLongForEvenTheSmallestFont() throws IOException {
        String absurdName = "Wolfeschlegelsteinhausenbergerdorff".repeat(6);
        byte[] pdf = generator.generateCertificatePdf(sampleData(CertificationLevel.L1, absurdName));

        String text = squash(extractText(pdf));
        assertThat(text).doesNotContain(squash(absurdName));
        assertThat(text).contains("Wolfeschlegel");
        assertThat(text).contains("...");
    }

    @Test
    void rendersNamesOutsideTheLatinAlphabetWithoutFailing() {
        // Standard-14 fonts cannot encode these; the renderer must degrade
        // rather than throw and block a legitimately earned certificate.
        assertThatCode(() -> generator.generateCertificatePdf(
                sampleData(CertificationLevel.L2, "秀英 王")))
                .doesNotThrowAnyException();
    }

    @Test
    void keepsAccentedLatinNamesIntact() throws IOException {
        byte[] pdf = generator.generateCertificatePdf(sampleData(CertificationLevel.L1, "José Muñoz Férnandez"));
        assertThat(squash(extractText(pdf))).contains(squash("José Muñoz Férnandez"));
    }

    @Test
    void capitalisesASurnameTypedInLowerCase() throws IOException {
        // Registration stores the name as typed, so a lower-case surname used to
        // be engraved that way.
        byte[] pdf = generator.generateCertificatePdf(sampleData(CertificationLevel.L2, "Aaru vki"));

        dumpIfRequested("L2_certificate_lowercase_surname.pdf", pdf);

        assertThat(squash(extractText(pdf))).contains("AaruVki");
    }

    @Test
    void leavesDeliberatelyCasedNamesAsTyped() {
        // Blindly title-casing would turn these into "Mcdonald", "O'brien" and
        // "Iii", each worse than the lower-case surname the rule exists to fix.
        assertThat(PdfBoxCertificatePdfGeneratorService.displayName("Ronan McDonald O'Brien III"))
                .isEqualTo("Ronan McDonald O'Brien III");
    }

    @Test
    void capitalisesEachPartOfAHyphenatedName() {
        assertThat(PdfBoxCertificatePdfGeneratorService.displayName("  aaru   featherstone-kensington "))
                .isEqualTo("Aaru Featherstone-Kensington");
    }

    @Test
    void stampsTheDesignVersionSoStaleFilesCanBeDetected() throws IOException {
        // Downloads compare this stamp against the current design to decide
        // whether a file left on disk by an earlier build has to be re-rendered.
        byte[] pdf = generator.generateCertificatePdf(sampleData(CertificationLevel.L1, "Priya Raghunathan"));

        try (PDDocument document = PDDocument.load(pdf)) {
            assertThat(document.getDocumentInformation()
                    .getCustomMetadataValue(CertificatePdfGeneratorService.DESIGN_VERSION_KEY))
                    .isEqualTo(CertificatePdfGeneratorService.DESIGN_VERSION);
        }
    }

    @Test
    void survivesAMissingQrCodePayload() {
        CertificatePdfData data = new CertificatePdfData(
                "CERT-2026-L1-ABCD1234",
                "Priya Raghunathan",
                "USR-001",
                CertificationLevel.L1,
                LocalDate.of(2026, 8, 12),
                LocalDate.of(2027, 8, 12),
                "http://localhost:8080/api/certificates/verify/CERT-2026-L1-ABCD1234",
                new byte[0]);

        assertThatCode(() -> generator.generateCertificatePdf(data)).doesNotThrowAnyException();
    }

    private CertificatePdfData sampleData(CertificationLevel level, String candidateName) {
        String number = "CERT-2026-" + level.name() + "-ABCD1234";
        return new CertificatePdfData(
                number,
                candidateName,
                "USR-001",
                level,
                LocalDate.of(2026, 8, 12),
                LocalDate.of(2027, 8, 12),
                "http://localhost:8080/api/certificates/verify/" + number,
                qrPng());
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

    /** A stand-in QR image; the renderer only needs a decodable PNG. */
    private static byte[] qrPng() {
        BufferedImage image = new BufferedImage(120, 120, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(Color.WHITE);
        graphics.fillRect(0, 0, 120, 120);
        graphics.setColor(Color.BLACK);
        for (int x = 0; x < 120; x += 20) {
            for (int y = 0; y < 120; y += 20) {
                if ((x + y) % 40 == 0) {
                    graphics.fillRect(x, y, 20, 20);
                }
            }
        }
        graphics.dispose();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "PNG", output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not build test QR image", ex);
        }
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
