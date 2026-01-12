package com.platforma.backend.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileResource {

    @Column(name = "title", length = 160)
    private String title;

    @Column(name = "description", length = 800)
    private String description;

    @Column(name = "url", length = 500)
    private String url;
}
