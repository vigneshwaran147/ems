package com.ems.service;

import java.util.List;

import com.ems.enums.CertificationLevel;

/**
 * Authoritative per-level certificate content.
 *
 * <p>Every word that appears on an issued certificate — the award title, the
 * tier line, the citation and the competency list — is defined here and nowhere
 * else. The renderer and the API both read from this enum, so a certificate PDF
 * and the certificate description shown in the UI can never disagree, and no
 * client is able to influence what a certificate claims.
 */
public enum CertificateTemplate {

    L1_FOUNDATION(
            CertificationLevel.L1,
            1,
            "LEVEL 1 · FOUNDATION CERTIFICATION",
            "EMS Foundation",
            "Engineer",
            "EMS Foundation Engineer",
            "BRONZE TIER · IPC-A-610 CLASS 2",
            "FOUNDATION",
            List.of(
                    new TextRun("has met the required standard of competence in the fundamentals of "
                            + "surface-mount technology and electronics manufacturing, and is certified "
                            + "to perform ", false),
                    new TextRun("supervised production tasks", true),
                    new TextRun(" in accordance with IPC-A-610 Class 2 acceptance criteria.", false)),
            List.of(
                    "SMT FUNDAMENTALS",
                    "COMPONENT ID",
                    "HAND SOLDERING",
                    "ESD CONTROL",
                    "PCB HANDLING",
                    "LINE SAFETY & 5S")),

    L2_ADVANCED(
            CertificationLevel.L2,
            2,
            "LEVEL 2 · ADVANCED CERTIFICATION",
            "Advanced EMS",
            "Engineer",
            "Advanced EMS Engineer",
            "SILVER TIER · IPC-A-610 CLASS 3",
            "ADVANCED",
            List.of(
                    new TextRun("has demonstrated advanced competence in SMT process engineering, "
                            + "inspection and defect resolution, and is certified to ", false),
                    new TextRun("set up, qualify and control production lines", true),
                    new TextRun(" to IPC-A-610 Class 3 acceptance criteria.", false)),
            List.of(
                    "REFLOW PROFILING",
                    "STENCIL & PASTE",
                    "AOI, SPI & X-RAY",
                    "IPC-A-610 CLASS 3",
                    "REWORK & REPAIR",
                    "PROCESS CAPABILITY")),

    L3_MASTER(
            CertificationLevel.L3,
            3,
            "LEVEL 3 · MASTER CERTIFICATION",
            "Master EMS",
            "Engineer",
            "Master EMS Engineer",
            "GOLD TIER · IPC LEAD / AUDIT",
            "MASTER",
            List.of(
                    new TextRun("has attained the highest level of certified mastery in electronics "
                            + "manufacturing, qualified to ", false),
                    new TextRun("lead new product introduction, own line qualification and process "
                            + "validation", true),
                    new TextRun(", and to audit manufacturing quality systems to IPC standards.", false)),
            List.of(
                    "LINE QUALIFICATION",
                    "DFM / DFT LEADERSHIP",
                    "SIX SIGMA & SPC",
                    "FAILURE ANALYSIS",
                    "NPI MANAGEMENT",
                    "AUDIT & COMPLIANCE"));

    /** Total number of levels in the certification ladder. */
    public static final int TOTAL_LEVELS = 3;

    private final CertificationLevel level;
    private final int levelIndex;
    private final String eyebrow;
    private final String titleLineOne;
    private final String titleLineTwo;
    private final String awardTitle;
    private final String tierLine;
    private final String chipCaption;
    private final List<TextRun> citation;
    private final List<String> competencies;

    CertificateTemplate(
            CertificationLevel level,
            int levelIndex,
            String eyebrow,
            String titleLineOne,
            String titleLineTwo,
            String awardTitle,
            String tierLine,
            String chipCaption,
            List<TextRun> citation,
            List<String> competencies) {
        this.level = level;
        this.levelIndex = levelIndex;
        this.eyebrow = eyebrow;
        this.titleLineOne = titleLineOne;
        this.titleLineTwo = titleLineTwo;
        this.awardTitle = awardTitle;
        this.tierLine = tierLine;
        this.chipCaption = chipCaption;
        this.citation = List.copyOf(citation);
        this.competencies = List.copyOf(competencies);
    }

    /** A stretch of citation text, optionally emphasised. */
    public record TextRun(String text, boolean bold) {
    }

    public static CertificateTemplate forLevel(CertificationLevel level) {
        for (CertificateTemplate template : values()) {
            if (template.level == level) {
                return template;
            }
        }
        throw new IllegalArgumentException("No certificate template defined for level " + level);
    }

    public CertificationLevel level() {
        return level;
    }

    /** 1-based position on the ladder, used for the "LEVEL n OF 3" progress marker. */
    public int levelIndex() {
        return levelIndex;
    }

    /** Small caps line above the award title, e.g. "LEVEL 1 · FOUNDATION CERTIFICATION". */
    public String eyebrow() {
        return eyebrow;
    }

    public String titleLineOne() {
        return titleLineOne;
    }

    public String titleLineTwo() {
        return titleLineTwo;
    }

    /** Full award title on one line, for the API and the PDF document title. */
    public String awardTitle() {
        return awardTitle;
    }

    public String tierLine() {
        return tierLine;
    }

    /** Caption printed under the level number inside the chip graphic. */
    public String chipCaption() {
        return chipCaption;
    }

    public List<TextRun> citation() {
        return citation;
    }

    public List<String> competencies() {
        return competencies;
    }

    /** The citation as plain text, for API consumers that cannot render emphasis. */
    public String citationText() {
        StringBuilder builder = new StringBuilder();
        citation.forEach(run -> builder.append(run.text()));
        return builder.toString();
    }
}
