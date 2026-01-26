package com.platforma.backend.profile.dto;

import java.util.List;

public record CompanyItemDto(
        String name,
        String description,
        List<String> domains
) {}
