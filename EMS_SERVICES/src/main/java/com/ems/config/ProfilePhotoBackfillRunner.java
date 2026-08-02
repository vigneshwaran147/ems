package com.ems.config;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ems.entity.User;
import com.ems.repository.UserRepository;
import com.ems.service.ProfilePhotoStorageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
public class ProfilePhotoBackfillRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ProfilePhotoStorageService profilePhotoStorageService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<User> users = userRepository.findAllByProfilePhotoKeyIsNotNull();
        for (User user : users) {
            String value = user.getProfilePhotoKey();
            if (value == null || value.isBlank() || profilePhotoStorageService.isStoredReference(value)) {
                continue;
            }
            try {
                String storageKey = profilePhotoStorageService.storeProfilePhoto(value, user.getUserId());
                user.setProfilePhotoKey(storageKey);
            } catch (Exception ex) {
                log.warn("Profile photo backfill skipped for userId={} due to {}", user.getUserId(), ex.getMessage());
            }
        }
    }
}
