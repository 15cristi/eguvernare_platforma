package com.platforma.backend.publication.dto;

import lombok.*;

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

    private String title;
    private String venue;
    private Integer year;
    private String url;
}
