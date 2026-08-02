package com.ems.service.impl;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.dto.request.ExamDurationUpdateRequest;
import com.ems.dto.request.ExamPassingMarksUpdateRequest;
import com.ems.dto.request.ExamScheduleRequest;
import com.ems.dto.request.ExamUpsertRequest;
import com.ems.dto.response.ExamResponse;
import com.ems.entity.Exam;
import com.ems.enums.CertificationLevel;
import com.ems.enums.ExamStatus;
import com.ems.exception.BusinessException;
import com.ems.exception.ResourceNotFoundException;
import com.ems.repository.ExamRepository;
import com.ems.service.ExamService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional
public class ExamServiceImpl implements ExamService {

	private final ExamRepository examRepository;

	@Override
	public ExamResponse create(ExamUpsertRequest request) {
		validateRequest(request);
		if (examRepository.existsByExamCodeIgnoreCase(request.examCode())) {
			throw new BusinessException("Exam code already exists", HttpStatus.CONFLICT);
		}

		Exam exam = Exam.builder()
				.examCode(request.examCode().trim().toUpperCase())
				.examName(request.examName().trim())
				.certificationLevel(request.certificationLevel())
				.durationMinutes(request.durationMinutes())
				.totalMarks(request.totalMarks())
				.passingPercentage(request.passingPercentage())
				.examStatus(ExamStatus.SCHEDULED)
				.published(false)
				.build();

		Exam savedExam = examRepository.save(exam);
		log.info("Exam created: code={}, id={}", savedExam.getExamCode(), savedExam.getId());
		return toResponse(savedExam);
	}

	@Override
	public ExamResponse update(Long examId, ExamUpsertRequest request) {
		validateRequest(request);

		Exam existingExam = findExam(examId);
		examRepository.findByExamCodeIgnoreCase(request.examCode())
				.filter(exam -> !exam.getId().equals(examId))
				.ifPresent(exam -> {
					throw new BusinessException("Exam code already exists", HttpStatus.CONFLICT);
				});

		existingExam.setExamCode(request.examCode().trim().toUpperCase());
		existingExam.setExamName(request.examName().trim());
		existingExam.setCertificationLevel(request.certificationLevel());
		existingExam.setDurationMinutes(request.durationMinutes());
		existingExam.setTotalMarks(request.totalMarks());
		existingExam.setPassingPercentage(request.passingPercentage());

		Exam savedExam = examRepository.save(existingExam);
		log.info("Exam updated: code={}, id={}", savedExam.getExamCode(), savedExam.getId());
		return toResponse(savedExam);
	}

	@Override
	public void delete(Long examId) {
		Exam exam = findExam(examId);
		examRepository.delete(exam);
		log.info("Exam deleted: code={}, id={}", exam.getExamCode(), exam.getId());
	}

	@Override
	public ExamResponse publish(Long examId) {
		Exam exam = findExam(examId);
		exam.setPublished(true);
		Exam savedExam = examRepository.save(exam);
		log.info("Exam published: code={}, id={}", savedExam.getExamCode(), savedExam.getId());
		return toResponse(savedExam);
	}

	@Override
	public ExamResponse schedule(Long examId, ExamScheduleRequest request) {
		Exam exam = findExam(examId);
		if (!request.scheduledEndTime().isAfter(request.scheduledStartTime())) {
			throw new BusinessException("Scheduled end time must be after scheduled start time");
		}

		exam.setScheduledStartTime(request.scheduledStartTime());
		exam.setScheduledEndTime(request.scheduledEndTime());
		exam.setExamStatus(ExamStatus.SCHEDULED);
		Exam savedExam = examRepository.save(exam);
		log.info("Exam scheduled: code={}, id={}", savedExam.getExamCode(), savedExam.getId());
		return toResponse(savedExam);
	}

	@Override
	public ExamResponse updateDuration(Long examId, ExamDurationUpdateRequest request) {
		Exam exam = findExam(examId);
		exam.setDurationMinutes(request.durationMinutes());
		Exam savedExam = examRepository.save(exam);
		return toResponse(savedExam);
	}

	@Override
	public ExamResponse updatePassingMarks(Long examId, ExamPassingMarksUpdateRequest request) {
		Exam exam = findExam(examId);
		exam.setPassingPercentage(request.passingPercentage());
		Exam savedExam = examRepository.save(exam);
		return toResponse(savedExam);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ExamResponse> search(String examCode, String examName, CertificationLevel certificationLevel,
			ExamStatus examStatus, Boolean published) {
		String examCodePattern = toLikePattern(examCode);
		String examNamePattern = toLikePattern(examName);

		return examRepository.search(examCodePattern, examNamePattern, certificationLevel, examStatus, published).stream()
				.map(this::toResponse)
				.toList();
	}

	private String toLikePattern(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
	}

	private Exam findExam(Long examId) {
		return examRepository.findById(examId)
				.orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
	}

	private void validateRequest(ExamUpsertRequest request) {
		if (request.passingPercentage().compareTo(java.math.BigDecimal.valueOf(100)) > 0) {
			throw new BusinessException("Passing percentage must not exceed 100");
		}
	}

	private ExamResponse toResponse(Exam exam) {
		Instant createdAt = exam.getCreatedDate() == null ? null : exam.getCreatedDate().toInstant(ZoneOffset.UTC);
		Instant updatedAt = exam.getUpdatedDate() == null ? null : exam.getUpdatedDate().toInstant(ZoneOffset.UTC);

		return new ExamResponse(
				exam.getId(),
				exam.getExamCode(),
				exam.getExamName(),
				exam.getCertificationLevel(),
				exam.getDurationMinutes(),
				exam.getTotalMarks(),
				exam.getPassingPercentage(),
				exam.getExamStatus(),
				exam.isPublished(),
				exam.getScheduledStartTime(),
				exam.getScheduledEndTime(),
				createdAt,
				updatedAt);
	}
}
