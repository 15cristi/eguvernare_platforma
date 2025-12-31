package com.platforma.backend.metadata;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/metadata")
public class MetadataController {

    @GetMapping("/expert-areas")
    public List<String> expertAreas() {
        return EXPERT_AREAS;
    }

    @GetMapping("/company-domains")
    public List<String> companyDomains() {
        return COMPANY_DOMAINS;
    }

    private static final List<String> EXPERT_AREAS = List.of(
            // TODO: lipește lista din "Expert Areas list.docx"
            "Software Engineering",
            "Data Science"
    );

    private static final List<String> COMPANY_DOMAINS = List.of(
            // TODO: lipește lista din "Domains for Companies and Startups .docx"
            "FinTech",
            "EdTech"
    );
}
