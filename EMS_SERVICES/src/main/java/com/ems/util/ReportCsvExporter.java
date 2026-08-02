package com.ems.util;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.http.HttpStatus;

import com.ems.exception.BusinessException;

public final class ReportCsvExporter {

    private ReportCsvExporter() {
    }

    public static byte[] export(String[] headers, List<String[]> rows) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             PrintWriter writer = new PrintWriter(out, true, java.nio.charset.StandardCharsets.UTF_8);
             CSVPrinter printer = new CSVPrinter(writer,
                     CSVFormat.DEFAULT.builder()
                             .setHeader(headers)
                             .build())) {
            for (String[] row : rows) {
                printer.printRecord((Object[]) row);
            }
            printer.flush();
            return out.toByteArray();
        } catch (IOException ex) {
            throw new BusinessException("Failed to generate CSV report", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
