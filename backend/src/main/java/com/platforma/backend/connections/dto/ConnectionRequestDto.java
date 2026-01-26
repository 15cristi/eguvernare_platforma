package com.platforma.backend.connections.dto;

import java.time.Instant;

public record ConnectionRequestDto(
        Long id,
        Long fromUserId,
        String fromFirstName,
        String fromLastName,
        String fromRole,
        String fromAvatarUrl,
        Instant createdAt
) {}
