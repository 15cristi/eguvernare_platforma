package com.platforma.backend.profile;

import com.platforma.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

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
