package com.platforma.backend.announcement;

import com.platforma.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnnouncementLikeRepository extends JpaRepository<AnnouncementLike, Long> {
    long countByPostId(Long postId);
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    Optional<AnnouncementLike> findByPostIdAndUserId(Long postId, Long userId);
}
