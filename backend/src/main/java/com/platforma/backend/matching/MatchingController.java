package com.platforma.backend.matching;

import com.platforma.backend.common.PageResponse;
import com.platforma.backend.connections.ConnectionsService;
import com.platforma.backend.matching.dto.MatchingProfileDto;
import com.platforma.backend.profile.Profile;
import com.platforma.backend.profile.ProfileService;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final UserRepository userRepository;
    private final ProfileService profileService;
    private final ConnectionsService connectionsService;

    public enum SortBy {
        NAME,
        EXPERTISE_AREA,
        AVAILABILITY,
        OPEN_TO_PROJECTS,
        OPEN_TO_MENTORING,
        EXPERIENCE_LEVEL
    }

    @GetMapping("/profiles")
    public PageResponse<MatchingProfileDto> list(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "expertiseArea", required = false) String expertiseArea,
            @RequestParam(value = "availability", required = false) String availability,
            @RequestParam(value = "openToProjects", required = false) Boolean openToProjects,
            @RequestParam(value = "openToMentoring", required = false) Boolean openToMentoring,
            @RequestParam(value = "experienceLevel", required = false) String experienceLevel,
            @RequestParam(value = "sort", defaultValue = "NAME") SortBy sort,
            @RequestParam(value = "dir", defaultValue = "ASC") String dir
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));

        String query = norm(q);
        String exp = norm(expertiseArea);
        String av = norm(availability);
        String lvl = norm(experienceLevel);
        boolean asc = !(dir != null && dir.equalsIgnoreCase("DESC"));

        Long me = currentUser == null ? null : currentUser.getId();

        List<User> users = userRepository.findAll().stream()
                .filter(u -> u != null && u.getId() != null)
                .filter(u -> me == null || !Objects.equals(u.getId(), me))
                .toList();

        List<MatchingProfileDto> all = new ArrayList<>(users.size());
        for (User u : users) {
            Profile p = profileService.getProfile(u.getId());
            all.add(toDto(u, p, "NONE"));
        }

        if (!query.isEmpty()) {
            String ql = query.toLowerCase(Locale.ROOT);
            all = all.stream()
                    .filter(x -> joinName(x.firstName(), x.lastName()).toLowerCase(Locale.ROOT).contains(ql))
                    .collect(Collectors.toList());
        }

        if (!exp.isEmpty()) {
            String el = exp.toLowerCase(Locale.ROOT);
            all = all.stream()
                    .filter(x -> {
                        List<String> areas = x.expertAreas() == null ? List.of() : x.expertAreas();
                        return areas.stream().anyMatch(a -> norm(a).toLowerCase(Locale.ROOT).contains(el));
                    })
                    .collect(Collectors.toList());
        }

        if (!av.isEmpty()) {
            String avl = av.toLowerCase(Locale.ROOT);
            all = all.stream()
                    .filter(x -> norm(x.availability()).toLowerCase(Locale.ROOT).equals(avl))
                    .collect(Collectors.toList());
        }

        if (openToProjects != null) {
            all = all.stream()
                    .filter(x -> Boolean.TRUE.equals(x.openToProjects()) == openToProjects)
                    .collect(Collectors.toList());
        }

        if (openToMentoring != null) {
            all = all.stream()
                    .filter(x -> Boolean.TRUE.equals(x.openToMentoring()) == openToMentoring)
                    .collect(Collectors.toList());
        }

        if (!lvl.isEmpty()) {
            String ll = lvl.toLowerCase(Locale.ROOT);
            all = all.stream()
                    .filter(x -> norm(x.experienceLevel()).toLowerCase(Locale.ROOT).equals(ll))
                    .collect(Collectors.toList());
        }

        // pune status-urile de connect (doar pentru user logat)
        if (me != null) {
            Set<Long> ids = all.stream().map(MatchingProfileDto::userId).filter(Objects::nonNull).collect(Collectors.toSet());
            Map<Long, String> statuses = connectionsService.getStatusesForMatching(currentUser, ids);

            all = all.stream()
                    .map(x -> new MatchingProfileDto(
                            x.userId(),
                            x.firstName(),
                            x.lastName(),
                            x.role(),
                            x.headline(),
                            x.country(),
                            x.city(),
                            x.profession(),
                            x.faculty(),
                            x.expertAreas(),
                            x.availability(),
                            x.experienceLevel(),
                            x.openToProjects(),
                            x.openToMentoring(),
                            x.avatarUrl(),
                            statuses.getOrDefault(x.userId(), "NONE")
                    ))
                    .collect(Collectors.toList());
        }

        Comparator<MatchingProfileDto> cmp = comparator(sort);
        if (!asc) cmp = cmp.reversed();
        all.sort(cmp);

        long total = all.size();
        int totalPages = (int) Math.ceil(total / (double) safeSize);
        int from = Math.min(safePage * safeSize, (int) total);
        int to = Math.min(from + safeSize, (int) total);

        List<MatchingProfileDto> items = all.subList(from, to);

        return PageResponse.<MatchingProfileDto>builder()
                .items(items)
                .page(safePage)
                .size(safeSize)
                .totalElements(total)
                .totalPages(totalPages)
                .build();
    }

    private static String norm(String s) {
        return s == null ? "" : s.trim();
    }

    private static String joinName(String first, String last) {
        return (norm(first) + " " + norm(last)).trim();
    }

    private static MatchingProfileDto toDto(User u, Profile p, String status) {
        List<String> areas = null;

        if (p != null) {
            if (p.getExpertise() != null && !p.getExpertise().isEmpty()) {
                areas = p.getExpertise().stream()
                        .map(e -> e == null ? null : e.getArea())
                        .filter(Objects::nonNull)
                        .filter(x -> !norm(x).isEmpty())
                        .distinct()
                        .collect(Collectors.toList());
            } else if (p.getExpertAreas() != null) {
                areas = p.getExpertAreas().stream()
                        .filter(Objects::nonNull)
                        .filter(x -> !norm(x).isEmpty())
                        .distinct()
                        .collect(Collectors.toList());
            }
        }

        return new MatchingProfileDto(
                u.getId(),
                u.getFirstName(),
                u.getLastName(),
                u.getRole() == null ? null : u.getRole().name(),
                p == null ? null : p.getHeadline(),
                p == null ? null : p.getCountry(),
                p == null ? null : p.getCity(),
                p == null ? null : p.getProfession(),
                p == null ? null : p.getFaculty(),
                areas,
                p == null || p.getAvailability() == null ? null : p.getAvailability().name(),
                p == null || p.getExperienceLevel() == null ? null : p.getExperienceLevel().name(),
                p == null ? null : p.isOpenToProjects(),
                p == null ? null : p.isOpenToMentoring(),
                p == null ? null : p.getAvatarUrl(),
                status
        );
    }

    private static Comparator<MatchingProfileDto> comparator(SortBy sort) {
        Function<MatchingProfileDto, String> nameKey =
                x -> joinName(x.firstName(), x.lastName()).toLowerCase(Locale.ROOT);

        return switch (sort) {
            case EXPERTISE_AREA -> Comparator.<MatchingProfileDto, String>comparing(
                    x -> {
                        List<String> a = x.expertAreas() == null ? List.of() : x.expertAreas();
                        return (a.isEmpty() ? "" : norm(a.get(0))).toLowerCase(Locale.ROOT);
                    },
                    Comparator.nullsLast(String::compareTo)
            ).thenComparing(nameKey);

            case AVAILABILITY -> Comparator.<MatchingProfileDto, String>comparing(
                    x -> norm(x.availability()).toLowerCase(Locale.ROOT),
                    Comparator.nullsLast(String::compareTo)
            ).thenComparing(nameKey);

            case OPEN_TO_PROJECTS -> Comparator.<MatchingProfileDto, Boolean>comparing(
                    x -> Boolean.TRUE.equals(x.openToProjects())
            ).reversed().thenComparing(nameKey);

            case OPEN_TO_MENTORING -> Comparator.<MatchingProfileDto, Boolean>comparing(
                    x -> Boolean.TRUE.equals(x.openToMentoring())
            ).reversed().thenComparing(nameKey);

            case EXPERIENCE_LEVEL -> Comparator.<MatchingProfileDto, String>comparing(
                    x -> norm(x.experienceLevel()).toLowerCase(Locale.ROOT),
                    Comparator.nullsLast(String::compareTo)
            ).thenComparing(nameKey);

            case NAME -> Comparator.comparing(nameKey);
        };
    }
}
