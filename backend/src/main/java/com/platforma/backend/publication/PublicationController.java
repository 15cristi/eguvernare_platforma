package com.platforma.backend.publication;

import com.platforma.backend.publication.dto.PublicationRequest;
import com.platforma.backend.publication.dto.PublicationResponse;
import com.platforma.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.platforma.backend.common.PageResponse;
import org.springframework.data.domain.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publications")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationService publicationService;

    @GetMapping("/me")
    public List<PublicationResponse> myPublications(@AuthenticationPrincipal User user) {
        return toResponses(publicationService.listByUserId(user.getId()));
    }

    @GetMapping("/user/{userId}")
    public List<PublicationResponse> publicationsByUser(@AuthenticationPrincipal User currentUser, @PathVariable Long userId) {
        return toResponses(publicationService.listByUserId(userId));
    }

    @PostMapping("/me")
    public PublicationResponse create(@AuthenticationPrincipal User user, @RequestBody PublicationRequest req) {
        return toResponse(publicationService.create(user.getId(), req));
    }

    @PutMapping("/me/{publicationId}")
    public PublicationResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable Long publicationId,
            @RequestBody PublicationRequest req
    ) {
        return toResponse(publicationService.update(user.getId(), publicationId, req));
    }

    @DeleteMapping("/me/{publicationId}")
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long publicationId) {
        publicationService.delete(user.getId(), publicationId);
    }

    private List<PublicationResponse> toResponses(List<Publication> items) {
        return items.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private PublicationResponse toResponse(Publication p) {
        return PublicationResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .userFirstName(p.getUser().getFirstName())
                .userLastName(p.getUser().getLastName())
                .userRole(p.getUser().getRole() != null ? p.getUser().getRole().name() : null)
                .title(p.getTitle())
                .venue(p.getVenue())
                .year(p.getYear())
                .url(p.getUrl())
                .build();
    }


    @GetMapping
    public PageResponse<PublicationResponse> listAll(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);

        Page<Publication> result = publicationService.searchAll(q, PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id")));

        return PageResponse.<PublicationResponse>builder()
                .items(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

}
