package com.platforma.backend.project;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    // pentru My Projects / Projects by user
    List<Project> findByUserIdOrderByIdDesc(Long userId);

    // pentru Explore global (toată lumea + search)
    @Query("""
SELECT DISTINCT p FROM Project p
JOIN p.user u
LEFT JOIN p.partners pr
WHERE (:q IS NULL OR :q = '' OR
       LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(p.acronym, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(p.abstractEn, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(pr, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(p.coordinator, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(p.contractNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(p.url, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(u.firstName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
       LOWER(COALESCE(u.lastName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
)
""")
    Page<Project> searchAll(@Param("q") String q, Pageable pageable);

}
