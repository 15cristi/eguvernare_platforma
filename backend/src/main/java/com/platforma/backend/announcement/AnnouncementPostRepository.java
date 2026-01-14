package com.platforma.backend.announcement;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementPostRepository
        extends JpaRepository<AnnouncementPost, Long> {

    Page<AnnouncementPost>
    findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);
}
