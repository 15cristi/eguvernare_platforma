package com.platforma.backend.project.dto;

import lombok.*;

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
    private String userRole; // enum as string

    private String title;
    private String description;
    private String url;
}
