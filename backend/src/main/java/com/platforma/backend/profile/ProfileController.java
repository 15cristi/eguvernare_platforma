package com.platforma.backend.profile;

import com.platforma.backend.profile.dto.ProfileResponse;
import com.platforma.backend.profile.dto.ProfileUpdateRequest;
import com.platforma.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ProfileResponse getMyProfile(@AuthenticationPrincipal User user) {
        Profile p = profileService.getProfile(user.getId());
        return new ProfileResponse(
                p.getHeadline(),
                p.getBio(),
                p.getCountry(),
                p.getCity(),
                p.getFaculty(),
                p.getExpertAreas(),
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
}
