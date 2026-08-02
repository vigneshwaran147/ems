package com.ems.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.ExamSession;
import com.ems.entity.VideoRecording;

public interface VideoRecordingRepository extends JpaRepository<VideoRecording, Long> {

    List<VideoRecording> findByExamSessionOrderByRecordingStartTimeDesc(ExamSession examSession);

    List<VideoRecording> findAllByOrderByRecordingStartTimeDesc();
}
