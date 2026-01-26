package com.platforma.backend.connections.dto;

public record ConnectionNotificationDto(
        String kind,      // "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED" | "CONNECTION_REJECTED"
        Long requestId,
        Long fromUserId
) {}
