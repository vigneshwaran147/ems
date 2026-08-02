package com.ems.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.CertificationHistory;
import com.ems.entity.User;

public interface CertificationHistoryRepository extends JpaRepository<CertificationHistory, Long> {

    List<CertificationHistory> findByCertificationUserOrderByEventTimestampDesc(User user);
}
