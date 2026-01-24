package com.platforma.backend.announcement;

import com.platforma.backend.announcement.dto.AnnouncementDtos.*;
import com.platforma.backend.user.User;
import com.platforma.backend.user.Role;
import com.platforma.backend.user.UserRepository;
import com.platforma.backend.ws.WsEvent;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AnnouncementService {

    private final AnnouncementPostRepository postRepo;
    private final AnnouncementLikeRepository likeRepo;
    private final AnnouncementCommentRepository commentRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messaging;

    public AnnouncementService(
            AnnouncementPostRepository postRepo,
            AnnouncementLikeRepository likeRepo,
            AnnouncementCommentRepository commentRepo,
            UserRepository userRepo,
            SimpMessagingTemplate messaging
    ) {
        this.postRepo = postRepo;
        this.likeRepo = likeRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
        this.messaging = messaging;
    }

    private AuthorDto authorDto(User u) {
        return new AuthorDto(u.getId(), u.getFirstName(), u.getLastName(), String.valueOf(u.getRole()));
    }

    private CommentDto commentDto(AnnouncementComment c) {
        return new CommentDto(c.getId(), authorDto(c.getAuthor()), c.getContent(), c.getCreatedAt());
    }

    private PostDto postDto(AnnouncementPost p, Long myUserId) {
        long likeCount = likeRepo.countByPostId(p.getId());
        long commentCount = commentRepo.countByPostId(p.getId());
        boolean likedByMe = myUserId != null && likeRepo.existsByPostIdAndUserId(p.getId(), myUserId);

        List<CommentDto> latestComments = commentRepo
                .findTop20ByPostIdOrderByCreatedAtDescIdDesc(p.getId())
                .stream()
                .map(this::commentDto)
                .toList();

        return new PostDto(
                p.getId(),
                authorDto(p.getAuthor()),
                p.getContent(),
                p.getImageUrl(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                likeCount,
                commentCount,
                likedByMe,
                latestComments
        );
    }

    public List<PostDto> feed(Long myUserId, int page, int size) {
        var pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        return postRepo.findAllByOrderByCreatedAtDescIdDesc(pageable)
                .stream()
                .map(p -> postDto(p, myUserId))
                .toList();
    }

    @Transactional
    public PostDto createPost(Long myUserId, CreatePostRequest req) {
        String content = req.content() == null ? "" : req.content().trim();
        String imageUrl = req.imageUrl() == null ? null : req.imageUrl().trim();

        if (content.isBlank() && (imageUrl == null || imageUrl.isBlank())) {
            throw new IllegalArgumentException("Content or image is required");
        }

        User me = userRepo.findById(myUserId).orElseThrow();

        AnnouncementPost p = new AnnouncementPost();
        p.setAuthor(me);
        p.setContent(content);
        p.setImageUrl((imageUrl != null && !imageUrl.isBlank()) ? imageUrl : null);

        postRepo.save(p);

        PostDto dto = postDto(p, myUserId);
        messaging.convertAndSend("/topic/announcements", new WsEvent("announcement:created", dto));
        return dto;
    }

    @Transactional
    public PostDto toggleLike(Long myUserId, Long postId) {
        userRepo.findById(myUserId).orElseThrow();
        AnnouncementPost post = postRepo.findById(postId).orElseThrow();

        likeRepo.findByPostIdAndUserId(postId, myUserId).ifPresentOrElse(
                likeRepo::delete,
                () -> {
                    var l = new AnnouncementLike();
                    l.setPost(post);
                    l.setUser(userRepo.findById(myUserId).orElseThrow());
                    likeRepo.save(l);
                }
        );

        PostDto dto = postDto(post, myUserId);
        messaging.convertAndSend("/topic/announcements", new WsEvent("announcement:like:updated", dto));
        return dto;
    }

    @Transactional
    public CommentDto addComment(Long myUserId, Long postId, CreateCommentRequest req) {
        String content = req.content() == null ? "" : req.content().trim();
        if (content.isBlank()) throw new IllegalArgumentException("Content is required");

        User me = userRepo.findById(myUserId).orElseThrow();
        AnnouncementPost post = postRepo.findById(postId).orElseThrow();

        AnnouncementComment c = new AnnouncementComment();
        c.setAuthor(me);
        c.setPost(post);
        c.setContent(content);

        commentRepo.save(c);

        CommentDto dto = commentDto(c);
        messaging.convertAndSend("/topic/announcements",
                new WsEvent("announcement:comment:created", Map.of("postId", postId, "comment", dto)));
        return dto;
    }

    // ADMIN poate sterge orice postare; altfel doar owner
    @Transactional
    public void deletePost(Long requesterUserId, Long postId) {
        User me = userRepo.findById(requesterUserId).orElseThrow();
        AnnouncementPost post = postRepo.findById(postId).orElseThrow();

        boolean isOwner = post.getAuthor() != null && post.getAuthor().getId().equals(requesterUserId);
        boolean isAdmin = me.getRole() == Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Not allowed");
        }

        likeRepo.deleteByPostId(postId);
        commentRepo.deleteByPostId(postId);
        postRepo.delete(post);

        messaging.convertAndSend("/topic/announcements",
                new WsEvent("announcement:deleted", Map.of("postId", postId)));
    }

    // ADMIN sterge comment dupa id
    @Transactional
    public void deleteComment(Long requesterUserId, Long commentId) {
        User me = userRepo.findById(requesterUserId).orElseThrow();
        if (me.getRole() != Role.ADMIN) {
            throw new RuntimeException("Not allowed");
        }

        AnnouncementComment c = commentRepo.findById(commentId).orElseThrow();
        Long postId = c.getPost() != null ? c.getPost().getId() : null;

        commentRepo.delete(c);

        if (postId != null) {
            messaging.convertAndSend("/topic/announcements",
                    new WsEvent("announcement:comment:deleted", Map.of("postId", postId, "commentId", commentId)));
        }
    }
}
