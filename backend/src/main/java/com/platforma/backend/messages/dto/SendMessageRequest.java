package com.platforma.backend.messages.dto;

public record SendMessageRequest(
        String content,
        AttachmentDto attachment
) {}
