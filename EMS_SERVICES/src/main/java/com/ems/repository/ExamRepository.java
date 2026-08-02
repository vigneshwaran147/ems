package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ems.entity.Exam;
import com.ems.enums.CertificationLevel;
import com.ems.enums.ExamStatus;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    Optional<Exam> findByExamCodeIgnoreCase(String examCode);

    boolean existsByExamCodeIgnoreCase(String examCode);

//     @Query("""
//             select e from Exam e
//             where (:examCode is null or lower(e.examCode) like lower(concat('%', :examCode, '%')))
//             and (:examName is null or lower(e.examName) like lower(concat('%', :examName, '%')))
//             and (:certificationLevel is null or e.certificationLevel = :certificationLevel)
//             and (:examStatus is null or e.examStatus = :examStatus)
//             and (:published is null or e.published = :published)
//             order by e.examCode asc
//             """)
        @Query("""
        select e from Exam e
        where (:examCode is null or lower(e.examCode) like :examCode)
        and (:examName is null or lower(e.examName) like :examName)
        and (:certificationLevel is null or e.certificationLevel = :certificationLevel)
        and (:examStatus is null or e.examStatus = :examStatus)
        and (:published is null or e.published = :published)
        order by e.examCode
        """)
    List<Exam> search(
            @Param("examCode") String examCode,
            @Param("examName") String examName,
            @Param("certificationLevel") CertificationLevel certificationLevel,
            @Param("examStatus") ExamStatus examStatus,
            @Param("published") Boolean published);
}
