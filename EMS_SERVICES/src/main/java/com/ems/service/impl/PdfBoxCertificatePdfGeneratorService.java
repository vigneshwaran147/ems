package com.ems.service.impl;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.ems.exception.BusinessException;
import com.ems.service.CertificatePdfGeneratorService;

@Service
public class PdfBoxCertificatePdfGeneratorService implements CertificatePdfGeneratorService {

	@Override
	public byte[] generateCertificatePdf(CertificatePdfData data) {
		try (PDDocument document = new PDDocument();
				ByteArrayOutputStream output = new ByteArrayOutputStream()) {
			PDPage page = new PDPage(PDRectangle.A4);
			document.addPage(page);

			try (PDPageContentStream content = new PDPageContentStream(document, page)) {
				content.beginText();
				content.setFont(PDType1Font.HELVETICA_BOLD, 26);
				content.newLineAtOffset(150, 760);
				content.showText("EMS Certificate");
				content.endText();

				writeLine(content, 80, 700, "Certificate Number: " + data.certificateNumber());
				writeLine(content, 80, 670, "Candidate Name: " + data.candidateName());
				writeLine(content, 80, 640, "User ID: " + data.userId());
				writeLine(content, 80, 610, "Certification Level: " + data.certificationLevel());
				writeLine(content, 80, 580, "Issue Date: " + data.issueDate());
				writeLine(content, 80, 550, "Expiry Date: " + data.expiryDate());
				writeLine(content, 80, 520, "Verification URL:");
				writeLine(content, 80, 500, data.verificationUrl());

				BufferedImage qrImage = ImageIO.read(new ByteArrayInputStream(data.qrCodePng()));
				PDImageXObject qrObject = LosslessFactory.createFromImage(document, qrImage);
				content.drawImage(qrObject, 380, 500, 140, 140);
			}

			document.save(output);
			return output.toByteArray();
		} catch (IOException ex) {
			throw new BusinessException("Failed to generate certificate PDF", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private void writeLine(PDPageContentStream content, float x, float y, String value) throws IOException {
		content.beginText();
		content.setFont(PDType1Font.HELVETICA, 12);
		content.newLineAtOffset(x, y);
		content.showText(value);
		content.endText();
	}
}
