package com.ems.service.impl;

import java.awt.Color;
import java.io.IOException;
import java.text.Normalizer;

import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.util.Matrix;

/**
 * Thin drawing layer over a PDFBox content stream.
 *
 * <p>Two things it buys the certificate renderer. First, a top-down coordinate
 * system: PDF space has its origin at the bottom-left, which makes a layout
 * designed from the top of the page tedious to express and easy to get wrong.
 * Every method here takes {@code yTop} measured downwards from the top edge.
 *
 * <p>Second, safe text. The standard-14 PDF fonts are WinAnsi-encoded, and
 * asking PDFBox to draw a glyph outside that encoding throws. A candidate name
 * is user-supplied data, so anything drawn here is folded to encodable
 * characters first — see {@link #sanitize}.
 */
final class CertificateCanvas {

    /** Bezier constant for approximating a quarter circle arc. */
    private static final float KAPPA = 0.5523f;

    private final PDPageContentStream content;
    private final float pageHeight;

    CertificateCanvas(PDPageContentStream content, float pageHeight) {
        this.content = content;
        this.pageHeight = pageHeight;
    }

    /** Converts a distance measured down from the page top into PDF user space. */
    float y(float yTop) {
        return pageHeight - yTop;
    }

    /**
     * Folds text into something the WinAnsi standard fonts can actually draw.
     *
     * <p>Accented Latin characters are kept as-is because WinAnsi covers them.
     * Anything else is decomposed and stripped of combining marks, which turns
     * e.g. "ā" into "a" rather than losing it; only characters with no Latin
     * base at all (CJK, Arabic, Devanagari) degrade to '?'.
     */
    static String sanitize(String value, PDFont font) {
        if (value == null) {
            return "";
        }
        StringBuilder out = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            String ch = String.valueOf(value.charAt(i));
            if (encodable(font, ch)) {
                out.append(ch);
                continue;
            }
            String folded = Normalizer.normalize(ch, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "");
            out.append(encodable(font, folded) && !folded.isEmpty() ? folded : "?");
        }
        return out.toString();
    }

    private static boolean encodable(PDFont font, String text) {
        try {
            font.getStringWidth(text);
            return true;
        } catch (IOException | IllegalArgumentException ex) {
            return false;
        }
    }

    /** Width of {@code text} in points, including the extra character spacing. */
    static float textWidth(PDFont font, float size, float charSpacing, String text) {
        String safe = sanitize(text, font);
        if (safe.isEmpty()) {
            return 0f;
        }
        try {
            float base = font.getStringWidth(safe) / 1000f * size;
            return base + charSpacing * (safe.length() - 1);
        } catch (IOException ex) {
            // A sanitized string is encodable by construction; treat as empty.
            return 0f;
        }
    }

    void text(PDFont font, float size, Color color, float x, float yTop, String value) throws IOException {
        text(font, size, 0f, color, x, yTop, value);
    }

    /** Draws a single line of text with its baseline at {@code yTop}. */
    void text(PDFont font, float size, float charSpacing, Color color, float x, float yTop, String value)
            throws IOException {
        String safe = sanitize(value, font);
        if (safe.isEmpty()) {
            return;
        }
        content.beginText();
        content.setFont(font, size);
        content.setCharacterSpacing(charSpacing);
        content.setNonStrokingColor(color);
        content.newLineAtOffset(x, y(yTop));
        content.showText(safe);
        content.endText();
        content.setCharacterSpacing(0f);
    }

    /** Draws text horizontally centred on {@code centerX}. */
    void centeredText(PDFont font, float size, float charSpacing, Color color, float centerX, float yTop,
            String value) throws IOException {
        float width = textWidth(font, size, charSpacing, value);
        text(font, size, charSpacing, color, centerX - width / 2f, yTop, value);
    }

    /** Draws text ending at {@code rightX}. */
    void rightText(PDFont font, float size, float charSpacing, Color color, float rightX, float yTop, String value)
            throws IOException {
        float width = textWidth(font, size, charSpacing, value);
        text(font, size, charSpacing, color, rightX - width, yTop, value);
    }

    void fillRect(float x, float yTop, float width, float height, Color color) throws IOException {
        content.setNonStrokingColor(color);
        content.addRect(x, y(yTop + height), width, height);
        content.fill();
    }

    void strokeRect(float x, float yTop, float width, float height, float lineWidth, Color color) throws IOException {
        content.setStrokingColor(color);
        content.setLineWidth(lineWidth);
        content.addRect(x, y(yTop + height), width, height);
        content.stroke();
    }

    void line(float x1, float yTop1, float x2, float yTop2, float lineWidth, Color color) throws IOException {
        content.setStrokingColor(color);
        content.setLineWidth(lineWidth);
        content.moveTo(x1, y(yTop1));
        content.lineTo(x2, y(yTop2));
        content.stroke();
    }

    /** Horizontal rule of the given thickness. */
    void rule(float x, float yTop, float width, float thickness, Color color) throws IOException {
        fillRect(x, yTop, width, thickness, color);
    }

    void roundedRect(float x, float yTop, float width, float height, float radius, Color fill, Color stroke,
            float lineWidth) throws IOException {
        float bottom = y(yTop + height);
        float top = y(yTop);
        float right = x + width;
        float r = Math.min(radius, Math.min(width, height) / 2f);
        float k = r * KAPPA;

        content.moveTo(x + r, bottom);
        content.lineTo(right - r, bottom);
        content.curveTo(right - r + k, bottom, right, bottom + r - k, right, bottom + r);
        content.lineTo(right, top - r);
        content.curveTo(right, top - r + k, right - r + k, top, right - r, top);
        content.lineTo(x + r, top);
        content.curveTo(x + r - k, top, x, top - r + k, x, top - r);
        content.lineTo(x, bottom + r);
        content.curveTo(x, bottom + r - k, x + r - k, bottom, x + r, bottom);
        content.closePath();
        paint(fill, stroke, lineWidth);
    }

    void circle(float centerX, float centerYTop, float radius, Color fill, Color stroke, float lineWidth)
            throws IOException {
        float cy = y(centerYTop);
        float k = radius * KAPPA;

        content.moveTo(centerX - radius, cy);
        content.curveTo(centerX - radius, cy + k, centerX - k, cy + radius, centerX, cy + radius);
        content.curveTo(centerX + k, cy + radius, centerX + radius, cy + k, centerX + radius, cy);
        content.curveTo(centerX + radius, cy - k, centerX + k, cy - radius, centerX, cy - radius);
        content.curveTo(centerX - k, cy - radius, centerX - radius, cy - k, centerX - radius, cy);
        content.closePath();
        paint(fill, stroke, lineWidth);
    }

    private void paint(Color fill, Color stroke, float lineWidth) throws IOException {
        if (fill != null && stroke != null) {
            content.setNonStrokingColor(fill);
            content.setStrokingColor(stroke);
            content.setLineWidth(lineWidth);
            content.fillAndStroke();
        } else if (fill != null) {
            content.setNonStrokingColor(fill);
            content.fill();
        } else if (stroke != null) {
            content.setStrokingColor(stroke);
            content.setLineWidth(lineWidth);
            content.stroke();
        }
    }

    /**
     * Lays text out along a circular arc, one glyph at a time.
     *
     * @param startAngleDeg angle of the first glyph, measured counter-clockwise from east
     * @param sweepDeg      total arc consumed by the text; negative sweeps clockwise
     * @param flip          true for bottom-of-seal text, which must read left to right upside-up
     */
    void arcText(PDFont font, float size, Color color, float centerX, float centerYTop, float radius,
            float startAngleDeg, float sweepDeg, boolean flip, String value) throws IOException {
        String safe = sanitize(value, font);
        if (safe.isEmpty()) {
            return;
        }
        float cy = y(centerYTop);
        float step = safe.length() > 1 ? sweepDeg / (safe.length() - 1) : 0f;

        content.setNonStrokingColor(color);
        for (int i = 0; i < safe.length(); i++) {
            double angle = Math.toRadians(startAngleDeg + step * i);
            float gx = centerX + (float) (Math.cos(angle) * radius);
            float gy = cy + (float) (Math.sin(angle) * radius);
            // Tangent to the circle, so glyphs sit upright relative to the ring.
            double rotation = angle + (flip ? Math.PI / 2 : -Math.PI / 2);

            content.beginText();
            content.setFont(font, size);
            content.setTextMatrix(Matrix.getRotateInstance(rotation, gx, gy));
            content.showText(String.valueOf(safe.charAt(i)));
            content.endText();
        }
    }

    /** Restricts all later drawing to the given rectangle until the state is restored. */
    void clipRect(float x, float yTop, float width, float height) throws IOException {
        content.addRect(x, y(yTop + height), width, height);
        content.clip();
    }

    void saveState() throws IOException {
        content.saveGraphicsState();
    }

    void restoreState() throws IOException {
        content.restoreGraphicsState();
    }
}
