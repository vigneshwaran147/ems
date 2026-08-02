package com.ems.util;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;

import com.ems.exception.BusinessException;

public final class ReportExcelExporter {

    private ReportExcelExporter() {
    }

    public static byte[] export(String sheetName, String[] headers, List<String[]> rows) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            for (int col = 0; col < headers.length; col++) {
                var cell = headerRow.createCell(col);
                cell.setCellValue(headers[col]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(col, 5000);
            }

            for (int rowIdx = 0; rowIdx < rows.size(); rowIdx++) {
                Row row = sheet.createRow(rowIdx + 1);
                String[] data = rows.get(rowIdx);
                for (int col = 0; col < data.length; col++) {
                    row.createCell(col).setCellValue(data[col] == null ? "" : data[col]);
                }
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new BusinessException("Failed to generate Excel report", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
