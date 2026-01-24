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

    // 🔹 Basic identity (same for everyone)
    private String affiliation;
    private String profession;
    private String university;

    private String faculty;

    /**
     * Legacy flat list kept for backwards compatibility.
     * New UI should use {@link #expertise}.
     */
    @ElementCollection
    @CollectionTable(name = "profile_expert_areas", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "expert_area", length = 120)
    private List<String> expertAreas;

    // 🔹 Expertise with per-item description
    @ElementCollection
    @CollectionTable(name = "profile_expertise", joinColumns = @JoinColumn(name = "user_id"))
    private List<ProfileExpertise> expertise;

    // 🔹 Labs / resources shown on profile
    @ElementCollection
    @CollectionTable(name = "profile_resources", joinColumns = @JoinColumn(name = "user_id"))
    private List<ProfileResource> resources;

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
    @Column(length = 700)
    private String cvUrl;
    // 🔹 Links
    private String linkedinUrl;
    private String githubUrl;
    private String website;
}
