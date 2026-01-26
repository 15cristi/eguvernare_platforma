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
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import com.platforma.backend.profile.dto.CompanyItemDto;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

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
    public ProfileResponse updateMyProfile(
            @AuthenticationPrincipal User user,
            @RequestBody ProfileUpdateRequest req
    ) {
        Profile updated = profileService.updateProfile(user.getId(), req);
        return toResponse(updated, user);
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

        // companies (new shape), with fallback from legacy single-company fields
        List<CompanyItemDto> companies = null;
        if (p.getCompanies() != null && !p.getCompanies().isEmpty()) {
            companies = p.getCompanies().stream()
                    .map(c -> new CompanyItemDto(
                            c.getName(),
                            c.getDescription(),
                            c.getDomains()
                    ))
                    .collect(Collectors.toList());
        } else if (
                (p.getCompanyName() != null && !p.getCompanyName().isBlank()) ||
                        (p.getCompanyDescription() != null && !p.getCompanyDescription().isBlank()) ||
                        (p.getCompanyDomains() != null && !p.getCompanyDomains().isEmpty())
        ) {
            companies = List.of(new CompanyItemDto(
                    p.getCompanyName(),
                    p.getCompanyDescription(),
                    p.getCompanyDomains()
            ));
        }

        // keep legacy fields in sync (for older UI that still reads them)
        String companyName = p.getCompanyName();
        String companyDescription = p.getCompanyDescription();
        List<String> companyDomains = p.getCompanyDomains();

        if ((companyName == null || companyName.isBlank())
                && companies != null && !companies.isEmpty()) {
            CompanyItemDto first = companies.get(0);
            companyName = first.name();
            companyDescription = first.description();
            companyDomains = first.domains();
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
                p.getCvUrl(),

                // NEW
                companies,

                // legacy
                companyName,
                companyDescription,
                companyDomains,

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


    @PutMapping(value = "/me/cv/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadCv(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("No file uploaded");
        }

        Set<String> allowed = Set.of(
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );

        String contentType = file.getContentType() == null ? "" : file.getContentType();
        if (!allowed.contains(contentType)) {
            throw new RuntimeException("Unsupported file type: " + contentType);
        }

        String original = file.getOriginalFilename() == null ? "cv" : file.getOriginalFilename();
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) ext = original.substring(dot).toLowerCase();

        if (!(ext.equals(".pdf") || ext.equals(".doc") || ext.equals(".docx"))) {
            ext = contentType.equals("application/pdf") ? ".pdf"
                    : contentType.equals("application/msword") ? ".doc"
                    : ".docx";
        }

        Path dir = Path.of("uploads", "cv", String.valueOf(user.getId()));
        Files.createDirectories(dir);

        String filename = "cv_" + System.currentTimeMillis() + ext;
        Path target = dir.resolve(filename).normalize();

        Files.copy(file.getInputStream(), target);

        String url = "/uploads/cv/" + user.getId() + "/" + filename;

        profileService.updateCvUrl(user.getId(), url);
        return Map.of("cvUrl", url);
    }




}
