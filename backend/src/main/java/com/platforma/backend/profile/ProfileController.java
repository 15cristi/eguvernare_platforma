package com.platforma.backend.profile;

import com.platforma.backend.profile.dto.ExpertiseItemDto;
import com.platforma.backend.profile.dto.ProfileResponse;
import com.platforma.backend.profile.dto.ProfileUpdateRequest;
import com.platforma.backend.profile.dto.ResourceItemDto;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ProfileResponse getMyProfile(@AuthenticationPrincipal User user) {
        return toResponse(profileService.getProfile(user.getId()), user);
    }

    /**
     * Public profile view for a given user id (authenticated users only).
     * Used for announcements click-through.
     */
    @GetMapping("/{userId}")
    public ProfileResponse getProfileByUserId(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long userId
    ) {
        Profile p = profileService.getProfile(userId);
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return toResponse(p, u);
    }

    @PutMapping("/me")
    public Profile updateMyProfile(
            @AuthenticationPrincipal User user,
            @RequestBody ProfileUpdateRequest req
    ) {
        return profileService.updateProfile(user.getId(), req);
    }

    @PutMapping("/me/avatar")
    public Profile saveAvatar(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body
    ) {
        return profileService.updateAvatar(user.getId(), body.get("avatarUrl"));
    }

    private ProfileResponse toResponse(Profile p, User user) {
        // new shape, with fallback from legacy list
        List<ExpertiseItemDto> expertise = null;
        if (p.getExpertise() != null) {
            expertise = p.getExpertise().stream()
                    .map(i -> new ExpertiseItemDto(i.getArea(), i.getDescription()))
                    .collect(Collectors.toList());
        } else if (p.getExpertAreas() != null) {
            expertise = p.getExpertAreas().stream()
                    .map(a -> new ExpertiseItemDto(a, ""))
                    .collect(Collectors.toList());
        }

        List<ResourceItemDto> resources = null;
        if (p.getResources() != null) {
            resources = p.getResources().stream()
                    .map(i -> new ResourceItemDto(i.getTitle(), i.getDescription(), i.getUrl()))
                    .collect(Collectors.toList());
        }

        return new ProfileResponse(
                p.getHeadline(),
                p.getBio(),
                p.getCountry(),
                p.getCity(),

                p.getAffiliation(),
                p.getProfession(),
                p.getUniversity(),

                p.getFaculty(),
                p.getExpertAreas(),
                expertise,
                resources,
                p.getCompanyName(),
                p.getCompanyDescription(),
                p.getCompanyDomains(),
                p.isOpenToProjects(),
                p.isOpenToMentoring(),
                p.getAvailability(),
                p.getExperienceLevel(),
                p.getLinkedinUrl(),
                p.getGithubUrl(),
                p.getWebsite(),
                p.getAvatarUrl(),
                user.getRole()
        );
    }
}
