package com.platforma.backend.messages.dto;

public record AttachmentDto(
        Long id,
        String originalName,
        String mimeType,
        Long sizeBytes
) {}
