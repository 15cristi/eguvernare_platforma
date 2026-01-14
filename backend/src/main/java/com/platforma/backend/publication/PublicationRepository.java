package com.platforma.backend.publication;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findByUserIdOrderByIdDesc(Long userId);

    @Query("""
        select p from Publication p
        join p.user u
        where (:q is null or :q = '' or
               lower(p.title) like lower(concat('%', :q, '%')) or
               lower(coalesce(p.venue, '')) like lower(concat('%', :q, '%')) or
               lower(coalesce(p.url, '')) like lower(concat('%', :q, '%')) or
               cast(coalesce(p.year, 0) as string) like concat('%', :q, '%') or
               lower(coalesce(u.firstName, '')) like lower(concat('%', :q, '%')) or
               lower(coalesce(u.lastName, '')) like lower(concat('%', :q, '%'))
        )
        """)
    Page<Publication> searchAll(@Param("q") String q, Pageable pageable);
}
