package com.platforma.backend.connections.dto;

public record ConnectedProfileDto(
        Long userId,
        String firstName,
        String lastName,
        String role,
        String headline,
        String avatarUrl
) {}
