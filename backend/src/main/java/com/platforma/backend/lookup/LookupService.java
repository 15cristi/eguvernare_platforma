package com.platforma.backend.lookup;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LookupService {

    private final LookupValueRepository repo;

    public List<String> suggest(LookupCategory category, String q) {
        String query = (q == null) ? "" : q.trim();
        return repo.findTop10ByCategoryAndValueContainingIgnoreCaseOrderByValueAsc(category, query)
                .stream()
                .map(LookupValue::getValue)
                .toList();
    }

    public LookupValue upsert(LookupCategory category, String value) {
        String v = (value == null) ? "" : value.trim();
        if (v.isEmpty()) throw new IllegalArgumentException("value is required");

        return repo.findByCategoryAndValueIgnoreCase(category, v)
                .orElseGet(() -> repo.save(
                        LookupValue.builder()
                                .category(category)
                                .value(v)
                                .build()
                ));
    }
}
