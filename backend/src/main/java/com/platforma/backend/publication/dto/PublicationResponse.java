package com.platforma.backend.publication.dto;

import com.platforma.backend.publication.PublicationType;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicationResponse {

    private Long id;
    private Long userId;

    private String userFirstName;
    private String userLastName;
    private String userRole;

    private PublicationType type;

    private String title;
    private String venue;
    private Integer year;
    private String url;

    private String authors;
    private String externalLink;
    private LocalDate publishedDate;
    private String keywords;

    private String journalTitle;
    private String volumeIssue;
    private String pages;
    private String doi;
    private String publisher;

    private String pdfPath;
}
