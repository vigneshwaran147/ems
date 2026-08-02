package com.ems.entity;

import java.time.Instant;
import java.util.UUID;

import com.ems.enums.ExamStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true, of = "id")
@Entity
@Table(name = "exam_sessions")
public class ExamSession extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_token", nullable = false, unique = true)
    private UUID sessionToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_ref", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_ref", nullable = false)
    private Exam exam;

    @Column(name = "session_start_time")
    private Instant sessionStartTime;

    @Column(name = "session_end_time")
    private Instant sessionEndTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false, length = 20)
    private ExamStatus sessionStatus;

    @Column(name = "violation_count", nullable = false)
    private int violationCount;

    @Column(name = "browser_fingerprint", length = 255)
    private String browserFingerprint;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "selected_question_ids_json")
    private String selectedQuestionIdsJson;
}
