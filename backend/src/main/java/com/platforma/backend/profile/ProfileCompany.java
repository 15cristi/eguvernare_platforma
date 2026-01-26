package com.platforma.backend.profile;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "profile_companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private Profile profile;

    @Column(length = 200)
    private String name;

    @Column(length = 800)
    private String description;

    @ElementCollection
    @CollectionTable(name = "profile_company_domains_v2", joinColumns = @JoinColumn(name = "company_id"))
    @Column(name = "domain", length = 120)
    private List<String> domains;
}
