package com.platforma.backend.profile;

import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    public Profile updateProfile(Long userId, Profile updated) {
        Profile profile = getProfile(userId);

        profile.setHeadline(updated.getHeadline());
        profile.setBio(updated.getBio());
        profile.setCountry(updated.getCountry());
        profile.setCity(updated.getCity());
        profile.setAvailability(updated.getAvailability());
        profile.setExperienceLevel(updated.getExperienceLevel());
        profile.setOpenToProjects(updated.isOpenToProjects());
        profile.setOpenToMentoring(updated.isOpenToMentoring());
        profile.setLinkedinUrl(updated.getLinkedinUrl());
        profile.setGithubUrl(updated.getGithubUrl());
        profile.setWebsite(updated.getWebsite());

        return profileRepository.save(profile);
    }


    public Profile updateAvatar(Long userId, String avatarUrl) {
        Profile profile = getProfile(userId);
        profile.setAvatarUrl(avatarUrl);
        return profileRepository.save(profile);
    }
}
