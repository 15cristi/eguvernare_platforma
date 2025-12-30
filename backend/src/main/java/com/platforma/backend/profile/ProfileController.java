package com.platforma.backend.profile;

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
    public Profile getMyProfile(@AuthenticationPrincipal User user) {
        return profileService.getProfile(user.getId());
    }

    @PutMapping("/me")
    public Profile updateMyProfile(
            @AuthenticationPrincipal User user,
            @RequestBody Profile profile
    ) {
        return profileService.updateProfile(user.getId(), profile);
    }

    @PutMapping("/me/avatar")
    public Profile saveAvatar(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body
    ) {
        return profileService.updateAvatar(
                user.getId(),
                body.get("avatarUrl")
        );
    }
}
