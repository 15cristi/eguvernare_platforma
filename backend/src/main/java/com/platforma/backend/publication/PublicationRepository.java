package com.platforma.backend.publication;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PublicationRepository extends JpaRepository<Publication, Long> {

    // pentru My Publications / Publications by user
    List<Publication> findByUserIdOrderByYearDescIdDesc(Long userId);

    // pentru Explore global
    @Query("""
        SELECT p FROM Publication p
        JOIN p.user u
        WHERE (:q IS NULL OR :q = '' OR
               LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR
               LOWER(COALESCE(p.venue, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
               LOWER(COALESCE(p.url, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
               CAST(COALESCE(p.year, 0) AS string) LIKE CONCAT('%', :q, '%') OR
               LOWER(COALESCE(u.firstName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
               LOWER(COALESCE(u.lastName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
        )
        """)
    Page<Publication> searchAll(@Param("q") String q, Pageable pageable);
}
