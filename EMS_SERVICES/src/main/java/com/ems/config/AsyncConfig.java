package com.ems.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.task.DelegatingSecurityContextAsyncTaskExecutor;

/**
 * Executor backing the asynchronous proctoring write path.
 *
 * <p>Violation logging is bursty and write-heavy: during a live exam every
 * candidate's worker can flag a detection at once, each carrying a base64 frame.
 * Running those on a bounded, dedicated pool keeps them off Tomcat's request
 * threads while ensuring a detection storm degrades into queueing and caller-runs
 * back-pressure rather than unbounded memory growth.</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    public static final String PROCTORING_EXECUTOR = "proctoringTaskExecutor";

    @Bean(name = PROCTORING_EXECUTOR)
    public Executor proctoringTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(500);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("proctor-async-");

        // Back-pressure instead of dropping evidence: when the queue is saturated the
        // submitting request thread runs the task itself, which naturally throttles clients.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());

        // Let in-flight violation writes finish during a rolling deploy.
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();

        // Propagate the SecurityContext so JPA auditing stamps created_by with the
        // real candidate rather than falling back to the SYSTEM user.
        return new DelegatingSecurityContextAsyncTaskExecutor(executor);
    }
}
