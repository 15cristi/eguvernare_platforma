package com.platforma.backend.announcement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementCommentRepository extends JpaRepository<AnnouncementComment, Long> {
    long countByPostId(Long postId);
    List<AnnouncementComment> findTop20ByPostIdOrderByCreatedAtDescIdDesc(Long postId);
}
