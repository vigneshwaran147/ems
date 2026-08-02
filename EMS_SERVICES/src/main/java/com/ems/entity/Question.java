package com.ems.entity;

import java.math.BigDecimal;

import com.ems.enums.CertificationLevel;
import com.ems.enums.QuestionSeverity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "questions")
public class Question extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_code", nullable = false, unique = true, length = 50)
    private String questionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "certification_level", nullable = false, length = 10)
    private CertificationLevel certificationLevel;

    @Column(name = "question_category", nullable = false, length = 20)
    private String questionCategory;

    @Column(name = "question_type", nullable = false, length = 20)
    private String questionType;

    @Column(name = "question_text", nullable = false)
    private String questionText;

    @Column(name = "options_json", nullable = false)
    private String optionsJson;

    @Column(name = "correct_options_json", nullable = false)
    private String correctOptionsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 10)
    private QuestionSeverity severity;

    @Column(name = "marks", nullable = false, precision = 10, scale = 2)
    private BigDecimal marks;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;
}
