package com.platforma.backend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @PutMapping("/me/role")
    public User updateRole(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body
    ) {
        String role = body.get("role");

        user.setRole(Role.valueOf(role));
        return userRepository.save(user);
    }
}
