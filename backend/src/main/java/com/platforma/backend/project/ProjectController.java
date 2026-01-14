package com.platforma.backend.project;

import com.platforma.backend.project.dto.ProjectRequest;
import com.platforma.backend.project.dto.ProjectResponse;
import com.platforma.backend.user.User;
import com.platforma.backend.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.platforma.backend.common.PageResponse;
import org.springframework.data.domain.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("/me")
    public List<ProjectResponse> myProjects(@AuthenticationPrincipal User user) {
        return toResponses(projectService.listByUserId(user.getId()));
    }

    @GetMapping("/user/{userId}")
    public List<ProjectResponse> projectsByUser(@AuthenticationPrincipal User currentUser, @PathVariable Long userId) {
        return toResponses(projectService.listByUserId(userId));
    }

    @PostMapping("/me")
    public ProjectResponse create(@AuthenticationPrincipal User user, @RequestBody ProjectRequest req) {
        return toResponse(projectService.create(user.getId(), req));
    }

    @PutMapping("/me/{projectId}")
    public ProjectResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @RequestBody ProjectRequest req
    ) {
        return toResponse(projectService.update(user.getId(), projectId, req));
    }

    @DeleteMapping("/me/{projectId}")
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long projectId) {
        projectService.delete(user.getId(), projectId);
    }

    // Admin-only delete (any project)
    @DeleteMapping("/{projectId}")
    public void adminDelete(@AuthenticationPrincipal User user, @PathVariable Long projectId) {
        if (user == null || user.getRole() != Role.ADMIN) throw new RuntimeException("Not allowed");
        projectService.deleteAny(projectId);
    }

    private List<ProjectResponse> toResponses(List<Project> items) {
        return items.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private ProjectResponse toResponse(Project p) {
        return ProjectResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .userFirstName(p.getUser().getFirstName())
                .userLastName(p.getUser().getLastName())
                .userRole(p.getUser().getRole() != null ? p.getUser().getRole().name() : null)

                .title(p.getTitle())
                .acronym(p.getAcronym())
                .abstractEn(p.getAbstractEn())
                .partners(p.getPartners())
                .coordinator(p.getCoordinator())
                .contractNumber(p.getContractNumber())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .possibleExtensionEndDate(p.getPossibleExtensionEndDate())

                .url(p.getUrl())
                .build();
    }

    @GetMapping
    public PageResponse<ProjectResponse> listAll(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);

        Page<Project> result = projectService.searchAll(q, PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id")));

        return PageResponse.<ProjectResponse>builder()
                .items(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }
}
