package com.platforma.backend.lookup;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lookups")
@RequiredArgsConstructor
public class LookupController {

    private final LookupService lookupService;

    @GetMapping
    public List<String> suggest(
            @RequestParam LookupCategory category,
            @RequestParam(required = false) String q
    ) {
        return lookupService.suggest(category, q);
    }

    public record UpsertRequest(LookupCategory category, String value) {}

    @PostMapping
    public LookupValue upsert(@RequestBody UpsertRequest req) {
        return lookupService.upsert(req.category(), req.value());
    }
}
