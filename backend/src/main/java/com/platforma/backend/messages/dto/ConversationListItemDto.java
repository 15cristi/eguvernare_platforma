package com.platforma.backend.messages.dto;

public record ConversationListItemDto(
        Long conversationId,
        Long otherUserId,
        String otherName,
        String otherRole,
        String otherAvatarUrl,
        String lastMessagePreview
) {}
