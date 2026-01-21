package com.platforma.backend.project.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectRequest {

    private String title;                 // Titlu EN*
    private String acronym;               // Acronym*
    private String abstractEn;            // Abstract EN
    private List<String> partners;        // Parteneri (multiple)
    private String coordinator;           // Coordonator
    private String contractNumber;        // Numar contract*

    private LocalDate startDate;          // Data demararii*
    private LocalDate endDate;            // Data finalizarii*
    private LocalDate possibleExtensionEndDate; // Posibila intindere

    private String url;                   // optional
}
