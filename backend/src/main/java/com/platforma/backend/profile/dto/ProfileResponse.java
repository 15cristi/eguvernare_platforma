package com.platforma.backend.profile.dto;

import com.platforma.backend.profile.Availability;
import com.platforma.backend.profile.ExperienceLevel;
import com.platforma.backend.user.Role;

import java.util.List;

public record ProfileResponse(
        String headline,
        String bio,
        String country,
        String city,

        String affiliation,
        String profession,
        String university,

        String faculty,

        // legacy (flat)
        List<String> expertAreas,

        // new (with descriptions)
        List<ExpertiseItemDto> expertise,

        List<ResourceItemDto> resources,
        String cvUrl,
        String companyName,
        String companyDescription,
        List<String> companyDomains,

        boolean openToProjects,
        boolean openToMentoring,
        Availability availability,
        ExperienceLevel experienceLevel,

        String linkedinUrl,
        String githubUrl,
        String website,
        String avatarUrl,

        Role role
) {}
