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
public class ProfileExpertise {

    @Column(name = "area", length = 120)
    private String area;

    @Column(name = "description", length = 800)
    private String description;
}
