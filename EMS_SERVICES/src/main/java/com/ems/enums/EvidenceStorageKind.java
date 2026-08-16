package com.ems.enums;

/**
 * Where the bytes of a proctoring evidence frame actually live.
 *
 * <p>Mirrors the {@code storage_kind} CHECK constraint on
 * {@code proctor_evidence_blobs}.</p>
 */
public enum EvidenceStorageKind {

    /** Base64 string persisted inline in {@code evidence_payload}. */
    INLINE_BASE64,

    /** Frame offloaded to object storage; {@code object_storage_key} holds the pointer. */
    OBJECT_STORAGE
}
