package com.platforma.backend.lookup;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LookupValueRepository extends JpaRepository<LookupValue, Long> {

    List<LookupValue> findTop10ByCategoryAndValueContainingIgnoreCaseOrderByValueAsc(
            LookupCategory category,
            String value
    );

    Optional<LookupValue> findByCategoryAndValueIgnoreCase(LookupCategory category, String value);
}
