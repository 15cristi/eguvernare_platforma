package com.platforma.backend.matching.dto;

import java.util.List;


public record MatchingProfileDto(
        Long userId,
        String firstName,
        String lastName,
        String role,

        String headline,
        String country,
        String city,
        String profession,
        String faculty,

        List<String> expertAreas,
        String availability,
        String experienceLevel,
        Boolean openToProjects,
        Boolean openToMentoring,

        String avatarUrl,

        String connectionStatus // NONE | OUTGOING_PENDING | INCOMING_PENDING | CONNECTED

) {
}
