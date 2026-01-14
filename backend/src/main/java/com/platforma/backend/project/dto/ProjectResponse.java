package com.platforma.backend.project.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectResponse {

    private Long id;
    private Long userId;

    private String userFirstName;
    private String userLastName;
    private String userRole;

    private String title;
    private String acronym;
    private String abstractEn;
    private String partners;
    private String coordinator;
    private String contractNumber;

    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate possibleExtensionEndDate;

    private String url;
}
