package com.platforma.backend.profile;

import com.platforma.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    private Long id; // SAME ca user.id

    @Column(length = 500)
    private String avatarUrl;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    // 🔹 Info public
    private String headline;

    @Column(length = 500)
    private String bio;

    private String country;
    private String city;

    private String faculty;

    // 🔹 Areas (user expertise / interests)
    @ElementCollection
    @CollectionTable(name = "profile_expert_areas", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "expert_area", length = 120)
    private List<String> expertAreas;

    // 🔹 Company / startup (for roles that represent organizations)
    private String companyName;

    @Column(length = 800)
    private String companyDescription;

    @ElementCollection
    @CollectionTable(name = "profile_company_domains", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "domain", length = 120)
    private List<String> companyDomains;

    // 🔹 Matching signals
    private boolean openToProjects;
    private boolean openToMentoring;

    @Enumerated(EnumType.STRING)
    private Availability availability;

    @Enumerated(EnumType.STRING)
    private ExperienceLevel experienceLevel;

    // 🔹 Links
    private String linkedinUrl;
    private String githubUrl;
    private String website;
}
