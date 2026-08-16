package com.ems.service.impl;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.ems.event.ExamPassedEvent;
import com.ems.service.CertificateService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Issues the certificate for a level as soon as the candidate clears it.
 *
 * <p>Passing an exam is what earns the certificate, so the PDF is produced by
 * the result flow rather than waiting for the candidate to ask for it — a
 * candidate who never revisited the result screen previously ended up with an
 * awarded level and no certificate to download.
 *
 * <p>Issuance runs after the evaluating transaction commits, and deliberately
 * swallows its own failures. Rendering writes to disk, and a full volume or a
 * bad storage path must not roll back a submitted exam result: the award is
 * already recorded, and a download re-renders any certificate whose file is
 * missing, so a failure here costs a little latency on first download and
 * nothing else.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class CertificateIssuanceListener {

    private final CertificateService certificateService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onExamPassed(ExamPassedEvent event) {
        try {
            certificateService.generateForSession(event.email(), event.sessionId());
            log.info("Certificate issued on exam pass: sessionId={}", event.sessionId());
        } catch (Exception ex) {
            log.error("Automatic certificate issuance failed, will be retried on download: sessionId={}",
                    event.sessionId(), ex);
        }
    }
}
