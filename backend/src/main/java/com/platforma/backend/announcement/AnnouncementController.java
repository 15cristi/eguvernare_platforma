package com.platforma.backend.announcement;

import com.platforma.backend.announcement.dto.AnnouncementDtos.*;
import com.platforma.backend.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    private final AnnouncementService service;
    private final UserRepository userRepository;

    public AnnouncementController(AnnouncementService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    private Long myUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return null;

        String email = auth.getName();
        if (email == null || email.isBlank()) return null;

        return userRepository.findByEmail(email)
                .map(u -> u.getId())
                .orElse(null);
    }

    @GetMapping("/feed")
    public List<PostDto> feed(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return service.feed(myUserId(auth), page, size);
    }

    @PostMapping
    public PostDto create(Authentication auth, @RequestBody CreatePostRequest req) {
        Long uid = myUserId(auth);
        if (uid == null) throw new RuntimeException("Unauthorized");
        return service.createPost(uid, req);
    }

    @PostMapping("/{postId}/like")
    public PostDto like(Authentication auth, @PathVariable Long postId) {
        Long uid = myUserId(auth);
        if (uid == null) throw new RuntimeException("Unauthorized");
        return service.toggleLike(uid, postId);
    }

    @PostMapping("/{postId}/comments")
    public CommentDto comment(Authentication auth, @PathVariable Long postId, @RequestBody CreateCommentRequest req) {
        Long uid = myUserId(auth);
        if (uid == null) throw new RuntimeException("Unauthorized");
        return service.addComment(uid, postId, req);
    }
}
