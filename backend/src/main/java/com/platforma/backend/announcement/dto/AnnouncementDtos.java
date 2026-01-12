package com.platforma.backend.announcement.dto;

import java.time.Instant;
import java.util.List;

public class AnnouncementDtos {

    public record CreatePostRequest(String content, String imageUrl) {}
    public record CreateCommentRequest(String content) {}

    public record AuthorDto(Long id, String firstName, String lastName, String role) {}

    public record CommentDto(
            Long id,
            AuthorDto author,
            String content,
            Instant createdAt
    ) {}

    public record PostDto(
            Long id,
            AuthorDto author,
            String content,
            String imageUrl,
            Instant createdAt,
            Instant updatedAt,
            long likeCount,
            long commentCount,
            boolean likedByMe,
            List<CommentDto> latestComments
    ) {}
}
