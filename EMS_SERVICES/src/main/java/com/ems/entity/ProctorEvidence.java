package com.ems.entity;

import java.time.Instant;

import com.ems.enums.EvidenceStorageKind;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Large proctoring media isolated from {@link Violation}.
 *
 * <p>The violation log is read constantly during a live exam (strike counts,
 * invigilator timelines). Keeping multi-hundred-KB base64 frames in a separate
 * table means those hot scans never pull blob pages into shared buffers.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true, of = "id")
@Entity
@Table(name = "proctor_evidence_blobs")
public class ProctorEvidence extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "violation_ref", nullable = false, unique = true)
    private Violation violation;

    /**
     * Denormalised session reference so evidence can be swept per session
     * without joining through {@code violations}.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_session_ref", nullable = false)
    private ExamSession examSession;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_kind", nullable = false, length = 20)
    private EvidenceStorageKind storageKind;

    @Column(name = "media_type", nullable = false, length = 60)
    private String mediaType;

    /**
     * Raw base64 payload (without the {@code data:} URI prefix).
     *
     * <p>Mapped as plain {@code TEXT} rather than {@code @Lob}: on PostgreSQL,
     * {@code @Lob String} routes through the large-object API and breaks against a
     * {@code TEXT} column. {@code TEXT} is TOAST-compressed and stored out-of-line
     * automatically, which is exactly the isolation this table exists for.</p>
     */
    @Column(name = "evidence_payload", columnDefinition = "TEXT")
    private String evidencePayload;

    /** Object-storage key used when the deployment offloads frames to S3. */
    @Column(name = "object_storage_key", length = 512)
    private String objectStorageKey;

    @Column(name = "payload_bytes", nullable = false)
    private long payloadBytes;

    @Column(name = "frame_width")
    private Integer frameWidth;

    @Column(name = "frame_height")
    private Integer frameHeight;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;
}
