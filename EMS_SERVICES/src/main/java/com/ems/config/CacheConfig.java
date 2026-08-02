package com.ems.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(java.util.List.of(
                build("dashboard", 1_000, Duration.ofMinutes(2)),
                build("questionById", 5_000, Duration.ofMinutes(20)),
                build("questionSearch", 2_000, Duration.ofMinutes(10)),
                build("certificateVerification", 5_000, Duration.ofMinutes(30)),
                build("reports", 500, Duration.ofMinutes(5))));
        return manager;
    }

    private CaffeineCache build(String name, long maxSize, Duration ttl) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(ttl)
                .recordStats()
                .build());
    }
}
