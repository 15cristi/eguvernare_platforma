package com.platforma.backend.publication;

import com.platforma.backend.publication.dto.PublicationRequest;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final UserRepository userRepository;

    public List<Publication> listByUserId(Long userId) {
        return publicationRepository.findByUserIdOrderByIdDesc(userId);
    }

    public Publication create(Long userId, PublicationRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Publication p = Publication.builder()
                .user(user)
                .type(req.getType())
                .title(safe(req.getTitle()))
                .venue(safe(req.getVenue()))
                .year(req.getYear())
                .url(safe(req.getUrl()))

                .authors(safe(req.getAuthors()))
                .externalLink(safe(req.getExternalLink()))
                .publishedDate(req.getPublishedDate())
                .keywords(safe(req.getKeywords()))

                .journalTitle(safe(req.getJournalTitle()))
                .volumeIssue(safe(req.getVolumeIssue()))
                .pages(safe(req.getPages()))
                .doi(safe(req.getDoi()))
                .publisher(safe(req.getPublisher()))
                .build();

        if (p.getType() == null) throw new RuntimeException("Type is required");
        if (isBlank(p.getTitle())) throw new RuntimeException("Title is required");
        if (p.getPublishedDate() == null) throw new RuntimeException("Published date is required");

        if ((p.getType() == PublicationType.CARTE || p.getType() == PublicationType.CAPITOL_CARTE) && isBlank(p.getPublisher())) {
            throw new RuntimeException("Publisher is required for books/chapters");
        }
        if ((p.getType() == PublicationType.ARTICOL_JURNAL || p.getType() == PublicationType.LUCRARE_CONFERINTA) && isBlank(p.getJournalTitle())) {
            throw new RuntimeException("Journal/Conference title is required");
        }

        return publicationRepository.save(p);
    }

    public Publication update(Long currentUserId, Long publicationId, PublicationRequest req) {
        Publication p = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication not found"));

        if (!p.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Not allowed");
        }

        if (req.getType() != null) p.setType(req.getType());
        if (req.getTitle() != null) p.setTitle(safe(req.getTitle()));
        if (req.getVenue() != null) p.setVenue(safe(req.getVenue()));
        if (req.getYear() != null) p.setYear(req.getYear());
        if (req.getUrl() != null) p.setUrl(safe(req.getUrl()));

        if (req.getAuthors() != null) p.setAuthors(safe(req.getAuthors()));
        if (req.getExternalLink() != null) p.setExternalLink(safe(req.getExternalLink()));
        if (req.getPublishedDate() != null) p.setPublishedDate(req.getPublishedDate());
        if (req.getKeywords() != null) p.setKeywords(safe(req.getKeywords()));

        if (req.getJournalTitle() != null) p.setJournalTitle(safe(req.getJournalTitle()));
        if (req.getVolumeIssue() != null) p.setVolumeIssue(safe(req.getVolumeIssue()));
        if (req.getPages() != null) p.setPages(safe(req.getPages()));
        if (req.getDoi() != null) p.setDoi(safe(req.getDoi()));
        if (req.getPublisher() != null) p.setPublisher(safe(req.getPublisher()));

        if (p.getType() == null) throw new RuntimeException("Type is required");
        if (isBlank(p.getTitle())) throw new RuntimeException("Title is required");
        if (p.getPublishedDate() == null) throw new RuntimeException("Published date is required");

        if ((p.getType() == PublicationType.CARTE || p.getType() == PublicationType.CAPITOL_CARTE) && isBlank(p.getPublisher())) {
            throw new RuntimeException("Publisher is required for books/chapters");
        }
        if ((p.getType() == PublicationType.ARTICOL_JURNAL || p.getType() == PublicationType.LUCRARE_CONFERINTA) && isBlank(p.getJournalTitle())) {
            throw new RuntimeException("Journal/Conference title is required");
        }

        return publicationRepository.save(p);
    }

    public void delete(Long currentUserId, Long publicationId) {
        Publication p = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication not found"));

        if (!p.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Not allowed");
        }

        deleteInternal(p);
    }

    // folosit de endpointul admin
    public void deleteAny(Long publicationId) {
        Publication p = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication not found"));
        deleteInternal(p);
    }

    private void deleteInternal(Publication p) {
        // Best effort: daca exista PDF salvat, incerca sa-l stergi.
        if (p.getPdfPath() != null && p.getPdfPath().startsWith("/files/publications/")) {
            String fileName = p.getPdfPath().substring("/files/publications/".length());
            Path path = Paths.get("uploads", "publications", fileName);
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {
                // daca nu se poate sterge fisierul, stergem totusi randul din DB
            }
        }

        publicationRepository.delete(p);
    }

    public Page<Publication> searchAll(String q, Pageable pageable) {
        String query = (q == null) ? "" : q.trim();
        return publicationRepository.searchAll(query, pageable);
    }

    public Publication uploadPdf(Long userId, Long publicationId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new RuntimeException("Empty file");
        if (!"application/pdf".equalsIgnoreCase(file.getContentType())) throw new RuntimeException("Only PDF allowed");
        if (file.getSize() > 10 * 1024 * 1024) throw new RuntimeException("Max 10MB");

        Publication p = publicationRepository.findById(publicationId)
                .orElseThrow(() -> new RuntimeException("Publication not found"));

        if (!p.getUser().getId().equals(userId)) throw new RuntimeException("Not allowed");

        String name = "pub_" + publicationId + "_" + System.currentTimeMillis() + ".pdf";
        Path dir = Paths.get("uploads", "publications");

        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(name);

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new RuntimeException("Upload failed", e);
        }

        p.setPdfPath("/files/publications/" + name);
        return publicationRepository.save(p);
    }

    private String safe(String s) {
        if (s == null) return null;
        String v = s.trim();
        return v.isEmpty() ? null : v;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
