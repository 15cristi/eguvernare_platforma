package com.platforma.backend.publication.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicationRequest {
    private String title;
    private String venue;
    private Integer year;
    private String url;
}
