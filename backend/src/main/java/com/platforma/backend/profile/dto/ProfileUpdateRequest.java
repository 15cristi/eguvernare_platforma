package com.platforma.backend.profile.dto;

import com.platforma.backend.profile.Availability;
import com.platforma.backend.profile.ExperienceLevel;

import java.util.List;

public record ProfileUpdateRequest(
        String headline,
        String bio,
        String country,
        String city,
        String faculty,

        List<String> expertAreas,

        String companyName,
        String companyDescription,
        List<String> companyDomains,

        Boolean openToProjects,
        Boolean openToMentoring,
        Availability availability,
        ExperienceLevel experienceLevel,

        String linkedinUrl,
        String githubUrl,
        String website
) {}
