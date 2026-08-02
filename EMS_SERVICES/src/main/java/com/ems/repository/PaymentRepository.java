package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.entity.Payment;
import com.ems.entity.User;
import com.ems.enums.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTransactionId(String transactionId);

    Optional<Payment> findTopByCertificationApplicationIdOrderByCreatedDateDesc(
            Long certificationApplicationId);

    Optional<Payment> findByTransactionIdAndUser(String transactionId, User user);

    boolean existsByCertificationApplicationIdAndPaymentStatus(Long certificationApplicationId, PaymentStatus paymentStatus);

    List<Payment> findByUserOrderByCreatedDateDesc(User user);

    List<Payment> findAllByOrderByCreatedDateDesc();
}
