package com.ems.service;

public interface ProfilePhotoStorageService {

    String storeProfilePhoto(String rawProfilePhoto, String ownerHint);

    ProfilePhotoContent loadProfilePhoto(String storageKey);

    void deleteProfilePhoto(String storageKey);

    boolean isStoredReference(String value);

    String resolveAccessUrl(String storageKey);
}
