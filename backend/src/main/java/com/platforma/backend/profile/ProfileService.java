package com.platforma.backend.profile;

import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.platforma.backend.profile.dto.ProfileUpdateRequest;

import java.util.List;
import java.util.stream.Collectors;

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

        p.setHeadline(req.headline());
        p.setBio(req.bio());
        p.setCountry(req.country());
        p.setCity(req.city());

        p.setAffiliation(req.affiliation());
        p.setProfession(req.profession());
        p.setUniversity(req.university());
        p.setFaculty(req.faculty());
        if (req.cvUrl() != null && !req.cvUrl().startsWith("blob:")) {
            p.setCvUrl(req.cvUrl());
        }

        // legacy
        p.setExpertAreas(req.expertAreas());

        // new expertise + resources
        if (req.expertise() != null) {
            List<ProfileExpertise> items = req.expertise().stream()
                    .map(i -> ProfileExpertise.builder()
                            .area(i.area())
                            .description(i.description())
                            .build())
                    .collect(Collectors.toList());
            p.setExpertise(items);
        }

        if (req.resources() != null) {
            List<ProfileResource> items = req.resources().stream()
                    .map(i -> ProfileResource.builder()
                            .title(i.title())
                            .description(i.description())
                            .url(i.url())
                            .build())
                    .collect(Collectors.toList());
            p.setResources(items);
        }

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

    public Profile updateCvUrl(Long userId, String cvUrl) {
        Profile p = getProfile(userId);
        p.setCvUrl(cvUrl);
        return profileRepository.save(p);
    }



}
