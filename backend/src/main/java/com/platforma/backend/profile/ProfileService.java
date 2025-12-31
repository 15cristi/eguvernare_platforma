package com.platforma.backend.profile;

import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.platforma.backend.profile.dto.ProfileUpdateRequest;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;

    public Profile createProfileForUser(User user) {
        Profile profile = Profile.builder()
                .user(user)
                .openToProjects(true)
                .openToMentoring(false)
                .build();

        return profileRepository.save(profile);
    }

    public Profile getProfile(Long userId) {
        return profileRepository.findById(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    return createProfileForUser(user);
                });
    }

    public Profile updateProfile(Long userId, ProfileUpdateRequest req) {
        Profile p = profileRepository.findById(userId)
                .orElseGet(() -> {
                    Profile created = new Profile();
                    created.setId(userId);
                    return profileRepository.save(created);
                });

        // dacă vrei update complet (null overwrite)
        p.setHeadline(req.headline());
        p.setBio(req.bio());
        p.setCountry(req.country());
        p.setCity(req.city());
        p.setFaculty(req.faculty());

        p.setExpertAreas(req.expertAreas());

        p.setCompanyName(req.companyName());
        p.setCompanyDescription(req.companyDescription());
        p.setCompanyDomains(req.companyDomains());

        if (req.openToProjects() != null) p.setOpenToProjects(req.openToProjects());
        if (req.openToMentoring() != null) p.setOpenToMentoring(req.openToMentoring());

        p.setAvailability(req.availability());
        p.setExperienceLevel(req.experienceLevel());

        p.setLinkedinUrl(req.linkedinUrl());
        p.setGithubUrl(req.githubUrl());
        p.setWebsite(req.website());

        return profileRepository.save(p);
    }



    public Profile updateAvatar(Long userId, String avatarUrl) {
        Profile profile = getProfile(userId);
        profile.setAvatarUrl(avatarUrl);
        return profileRepository.save(profile);
    }
}
