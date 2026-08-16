package com.ems.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import com.ems.config.AuditorAwareConfig;
import com.ems.config.JpaAuditingConfig;
import com.ems.entity.Exam;
import com.ems.entity.ExamSession;
import com.ems.entity.ProctorEvidence;
import com.ems.entity.User;
import com.ems.entity.Violation;
import com.ems.enums.CertificationLevel;
import com.ems.enums.EvidenceStorageKind;
import com.ems.enums.ExamStatus;
import com.ems.enums.ProctoringAction;
import com.ems.enums.ViolationType;

/**
 * Boots a real JPA context against an in-memory database.
 *
 * <p>Unit tests mock the repositories, so nothing else in the suite proves that
 * the derived query names introduced for the AI proctoring pipeline actually
 * parse, or that {@link ProctorEvidence} maps cleanly. Spring Data validates
 * derived queries at context startup, so a failure here is a startup failure in
 * production.</p>
 */
@DataJpaTest
@AutoConfigureTestDatabase
@Import({ JpaAuditingConfig.class, AuditorAwareConfig.class })
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=never",
        // The default `dev` profile pins the PostgreSQL dialect; override it so
        // Hibernate emits H2-compatible DML against the replaced test datasource.
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class ProctoringRepositoryQueryTest {

    @Autowired
    private ExamSessionRepository examSessionRepository;

    @Autowired
    private ViolationRepository violationRepository;

    @Autowired
    private ProctorEvidenceRepository proctorEvidenceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExamRepository examRepository;

    private ExamSession session;

    @BeforeEach
    void seed() {
        User user = userRepository.save(User.builder()
                .userId("EMS-0007")
                .firstName("Ada")
                .lastName("Lovelace")
                .email("candidate@example.com")
                .mobileNumber("9000000001")
                .passwordHash("hash")
                .currentSkillLevel("L1")
                .enabled(true)
                .build());

        Exam exam = examRepository.save(Exam.builder()
                .examCode("EX-L1")
                .examName("Foundation")
                .certificationLevel(CertificationLevel.L1)
                .durationMinutes(60)
                .totalMarks(new BigDecimal("100.00"))
                .passingPercentage(new BigDecimal("60.00"))
                .examStatus(ExamStatus.SCHEDULED)
                .published(true)
                .build());

        session = examSessionRepository.save(ExamSession.builder()
                .sessionToken(UUID.randomUUID())
                .user(user)
                .exam(exam)
                .sessionStartTime(Instant.now())
                .sessionStatus(ExamStatus.IN_PROGRESS)
                .violationCount(0)
                .build());
    }

    @Test
    void derivedFindersResolveTheCallersActiveSession() {
        Optional<ExamSession> active = examSessionRepository
                .findTopByUserEmailIgnoreCaseAndExamIdAndSessionStatusOrderByIdDesc(
                        "CANDIDATE@example.com", session.getExam().getId(), ExamStatus.IN_PROGRESS);

        assertThat(active).isPresent();
        assertThat(active.get().getId()).isEqualTo(session.getId());

        Optional<ExamSession> latest = examSessionRepository
                .findTopByUserEmailIgnoreCaseAndExamIdOrderByIdDesc(
                        "candidate@example.com", session.getExam().getId());

        assertThat(latest).isPresent();
    }

    @Test
    void derivedFindersDoNotLeakAnotherCandidatesSession() {
        Optional<ExamSession> foreign = examSessionRepository
                .findTopByUserEmailIgnoreCaseAndExamIdAndSessionStatusOrderByIdDesc(
                        "someone.else@example.com", session.getExam().getId(), ExamStatus.IN_PROGRESS);

        assertThat(foreign).isEmpty();
    }

    @Test
    void lockingFinderReturnsTheSessionRow() {
        Optional<ExamSession> locked = examSessionRepository.findByIdForUpdate(session.getId());

        assertThat(locked).isPresent();
        assertThat(locked.get().getSessionToken()).isEqualTo(session.getSessionToken());
    }

    @Test
    void evidenceRoundTripsAndAggregatesWithoutTouchingTheLog() {
        Violation violation = violationRepository.save(Violation.builder()
                .examSession(session)
                .violationType(ViolationType.PHONE_DETECTED)
                .violationLevel(1)
                .description("mobile phone in frame")
                .detectedAt(Instant.now())
                .actionTaken(ProctoringAction.WARNING)
                .build());

        proctorEvidenceRepository.save(ProctorEvidence.builder()
                .violation(violation)
                .examSession(session)
                .storageKind(EvidenceStorageKind.INLINE_BASE64)
                .mediaType("image/jpeg")
                .evidencePayload("QUJD")
                .payloadBytes(3L)
                .frameWidth(320)
                .frameHeight(240)
                .capturedAt(Instant.now())
                .build());

        assertThat(proctorEvidenceRepository.findByViolation(violation)).isPresent();
        assertThat(proctorEvidenceRepository.existsByViolation(violation)).isTrue();
        assertThat(proctorEvidenceRepository.countByExamSession(session)).isEqualTo(1);
        assertThat(proctorEvidenceRepository.findByExamSessionOrderByCapturedAtDesc(session)).hasSize(1);
        assertThat(proctorEvidenceRepository.sumPayloadBytesBySession(session.getId())).isEqualTo(3L);
        assertThat(proctorEvidenceRepository.findEvidenceMetadataBySession(session.getId())).hasSize(1);
    }

    @Test
    void newAiViolationTypesPersistAgainstTheExistingColumn() {
        for (ViolationType type : new ViolationType[] {
                ViolationType.PHONE_DETECTED,
                ViolationType.MULTIPLE_FACES,
                ViolationType.FACE_NOT_VISIBLE,
                ViolationType.FACE_TURNED_AWAY,
                ViolationType.EYES_OFF_SCREEN,
                ViolationType.BACKGROUND_NOISE,
                ViolationType.FULLSCREEN_EXIT,
                ViolationType.SCREEN_SHARE_STOPPED,
                ViolationType.SCREEN_SHARE_DENIED,
                ViolationType.NETWORK_LOSS,
                ViolationType.SCREEN_RECORDING_SUSPECTED }) {

            violationRepository.save(Violation.builder()
                    .examSession(session)
                    .violationType(type)
                    .violationLevel(1)
                    .detectedAt(Instant.now())
                    .actionTaken(ProctoringAction.LOGGED)
                    .build());
        }

        assertThat(violationRepository.countByExamSession(session)).isEqualTo(11);
    }
}
