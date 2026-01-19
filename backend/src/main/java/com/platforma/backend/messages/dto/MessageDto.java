package com.platforma.backend.messages.dto;

import java.time.Instant;
import java.util.List;

public record MessageDto(
        Long id,
        Long senderId,
        String content,
        Instant createdAt,
        List<AttachmentDto> attachments
) {}
