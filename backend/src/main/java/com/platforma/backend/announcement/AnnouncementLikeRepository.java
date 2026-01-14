package com.platforma.backend.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AnnouncementLikeRepository
        extends JpaRepository<AnnouncementLike, Long> {

    long countByPostId(Long postId);
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    Optional<AnnouncementLike> findByPostIdAndUserId(Long postId, Long userId);

    void deleteByPostId(Long postId);
}
