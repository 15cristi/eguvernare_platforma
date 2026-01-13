package com.platforma.backend.project;

import com.platforma.backend.project.dto.ProjectRequest;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.*;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public List<Project> listByUserId(Long userId) {
        return projectRepository.findByUserIdOrderByIdDesc(userId);
    }

    public Project create(Long userId, ProjectRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project p = Project.builder()
                .user(user)
                .title(safe(req.getTitle()))
                .description(safe(req.getDescription()))
                .url(safe(req.getUrl()))
                .build();

        if (p.getTitle() == null || p.getTitle().isBlank()) {
            throw new RuntimeException("Title is required");
        }

        return projectRepository.save(p);
    }

    public Project update(Long currentUserId, Long projectId, ProjectRequest req) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!p.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Not allowed");
        }

        if (req.getTitle() != null) p.setTitle(safe(req.getTitle()));
        if (req.getDescription() != null) p.setDescription(safe(req.getDescription()));
        if (req.getUrl() != null) p.setUrl(safe(req.getUrl()));

        if (p.getTitle() == null || p.getTitle().isBlank()) {
            throw new RuntimeException("Title is required");
        }

        return projectRepository.save(p);
    }

    public void delete(Long currentUserId, Long projectId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!p.getUser().getId().equals(currentUserId)) {
            throw new RuntimeException("Not allowed");
        }

        projectRepository.delete(p);
    }

    private String safe(String s) {
        if (s == null) return null;
        String v = s.trim();
        return v.isEmpty() ? null : v;
    }

    public Page<Project> searchAll(String q, Pageable pageable) {
        String query = (q == null) ? "" : q.trim();
        return projectRepository.searchAll(query, pageable);
    }

}
