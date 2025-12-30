package com.platforma.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.platforma.backend.profile.ProfileService;

import com.platforma.backend.user.Role;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authService;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final ProfileService profileService;
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String roleValue = body.get("role");
        String token = body.get("token");

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
                .setAudience(Collections.singletonList(
                        "285914242531-jq1gc46vt16ksngardsone3l7k61b9n7.apps.googleusercontent.com"
                ))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(token);

            if (idToken == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();

            String email = payload.getEmail();
            String fullName = (String) payload.get("name");

            String[] parts = fullName != null
                    ? fullName.split(" ", 2)
                    : new String[]{"", ""};

            User user = userRepository.findByEmail(email).orElse(null);

            // 🔥 USER NOU
            if (user == null) {

                if (roleValue == null) {
                    return ResponseEntity.badRequest()
                            .body("Role is required for new users");
                }

                Role role;
                try {
                    role = Role.valueOf(roleValue);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest()
                            .body("Invalid role");
                }

                user = new User();
                user.setEmail(email);
                user.setFirstName(parts[0]);
                user.setLastName(parts.length > 1 ? parts[1] : "");
                user.setPassword(""); // Google user
                user.setRole(role);

                user = userRepository.save(user);

                profileService.createProfileForUser(user);
            }

            String jwt = jwtService.generateToken(user);

            return ResponseEntity.ok(
                    new AuthResponse(
                            jwt,
                            new UserDto(user)
                    )
            );

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Google authentication failed");
        }
    }

}
