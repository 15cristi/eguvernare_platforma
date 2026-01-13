package com.platforma.backend.publication;

import com.platforma.backend.publication.dto.PublicationRequest;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.*;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final UserRepository userRepository;

    public List<Publication> listByUserId(Long userId) {
        return publicationRepository.findByUserIdOrderByYearDescIdDesc(userId);
    }

    public Publication create(Long userId, PublicationRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Publication p = Publication.builder()
                .user(user)
                .title(safe(req.getTitle()))
                .venue(safe(req.getVenue()))
                .year(req.getYear())
                .url(safe(req.getUrl()))
                .build();

        if (p.getTitle() == null || p.getTitle().isBlank()) {
            throw new RuntimeException("Title is required");
        }
        if (p.getYear() != null && (p.getYear() < 1900 || p.getYear() > 2100)) {
            throw new RuntimeException("Invalid year");
        }

        return publicationRepository.save(p);
    }

    public Publication update(Long currentUserId, Long publicationId, PublicationRequest req) {
        Publication p = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication not found"));

        if (!p.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Not allowed");
        }

        if (req.getTitle() != null) p.setTitle(safe(req.getTitle()));
        if (req.getVenue() != null) p.setVenue(safe(req.getVenue()));
        if (req.getYear() != null) p.setYear(req.getYear());
        if (req.getUrl() != null) p.setUrl(safe(req.getUrl()));

        if (p.getTitle() == null || p.getTitle().isBlank()) {
            throw new RuntimeException("Title is required");
        }
        if (p.getYear() != null && (p.getYear() < 1900 || p.getYear() > 2100)) {
            throw new RuntimeException("Invalid year");
        }

        return publicationRepository.save(p);
    }

    public void delete(Long currentUserId, Long publicationId) {
        Publication p = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication not found"));

        if (!p.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Not allowed");
        }
        publicationRepository.delete(p);
    }

    private String safe(String s) {
        if (s == null) return null;
        String v = s.trim();
        return v.isEmpty() ? null : v;
    }

    public Page<Publication> searchAll(String q, Pageable pageable) {
        String query = (q == null) ? "" : q.trim();
        return publicationRepository.searchAll(query, pageable);
    }
}
