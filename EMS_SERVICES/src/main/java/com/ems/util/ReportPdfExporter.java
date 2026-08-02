package com.ems.util;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.http.HttpStatus;

import com.ems.exception.BusinessException;

public final class ReportPdfExporter {

    private ReportPdfExporter() {
    }

    private static final float MARGIN = 40f;
    private static final float LINE_HEIGHT = 16f;
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    private static final float USABLE_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

    public static byte[] export(String title, String[] headers, List<String[]> rows) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            addPage(document, title, headers, rows);
            document.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new BusinessException("Failed to generate PDF report", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private static void addPage(PDDocument document, String title, String[] headers, List<String[]> rows)
            throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        float y = PAGE_HEIGHT - MARGIN;
        PDPageContentStream content = new PDPageContentStream(document, page);
        y = writeTitle(content, title, y);
        y -= LINE_HEIGHT;
        y = writeRow(content, headers, y, true);
        for (String[] row : rows) {
            if (y < MARGIN + LINE_HEIGHT * 2) {
                content.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                content = new PDPageContentStream(document, page);
                y = writeRow(content, headers, y, true);
            }
            y = writeRow(content, row, y, false);
        }
        content.close();
    }

    private static float writeTitle(PDPageContentStream content, String title, float y) throws IOException {
        content.beginText();
        content.setFont(PDType1Font.HELVETICA_BOLD, 16);
        content.newLineAtOffset(MARGIN, y);
        content.showText(title);
        content.endText();
        return y - LINE_HEIGHT * 2;
    }

    private static float writeRow(PDPageContentStream content, String[] values, float y, boolean bold)
            throws IOException {
        float x = MARGIN;
        float colWidth = (PDRectangle.A4.getWidth() - MARGIN * 2) / Math.max(1, values.length);
        content.setFont(bold ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA, 9);
        for (String value : values) {
            String cell = value == null ? "" : value;
            if (cell.length() > 30) {
                cell = cell.substring(0, 27) + "...";
            }
            content.beginText();
            content.newLineAtOffset(x, y);
            content.showText(cell);
            content.endText();
            x += colWidth;
        }
        return y - LINE_HEIGHT;
    }
}
