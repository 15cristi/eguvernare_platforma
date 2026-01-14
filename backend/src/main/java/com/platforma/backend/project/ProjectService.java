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
                .acronym(safe(req.getAcronym()))
                .abstractEn(safe(req.getAbstractEn()))
                .partners(safe(req.getPartners()))
                .coordinator(safe(req.getCoordinator()))
                .contractNumber(safe(req.getContractNumber()))
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .possibleExtensionEndDate(req.getPossibleExtensionEndDate())
                .url(safe(req.getUrl()))
                .build();

        if (isBlank(p.getTitle())) throw new RuntimeException("Title is required");
        if (isBlank(p.getAcronym())) throw new RuntimeException("Acronym is required");
        if (isBlank(p.getContractNumber())) throw new RuntimeException("Contract number is required");
        if (p.getStartDate() == null) throw new RuntimeException("Start date is required");
        if (p.getEndDate() == null) throw new RuntimeException("End date is required");

        if (p.getEndDate().isBefore(p.getStartDate())) throw new RuntimeException("End date must be after start date");
        if (p.getPossibleExtensionEndDate() != null && p.getPossibleExtensionEndDate().isBefore(p.getEndDate())) {
            throw new RuntimeException("Extension end date must be after end date");
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
        if (req.getAcronym() != null) p.setAcronym(safe(req.getAcronym()));
        if (req.getAbstractEn() != null) p.setAbstractEn(safe(req.getAbstractEn()));
        if (req.getPartners() != null) p.setPartners(safe(req.getPartners()));
        if (req.getCoordinator() != null) p.setCoordinator(safe(req.getCoordinator()));
        if (req.getContractNumber() != null) p.setContractNumber(safe(req.getContractNumber()));
        if (req.getStartDate() != null) p.setStartDate(req.getStartDate());
        if (req.getEndDate() != null) p.setEndDate(req.getEndDate());
        if (req.getPossibleExtensionEndDate() != null || req.getPossibleExtensionEndDate() == null) {
            p.setPossibleExtensionEndDate(req.getPossibleExtensionEndDate());
        }
        if (req.getUrl() != null) p.setUrl(safe(req.getUrl()));

        if (isBlank(p.getTitle())) throw new RuntimeException("Title is required");
        if (isBlank(p.getAcronym())) throw new RuntimeException("Acronym is required");
        if (isBlank(p.getContractNumber())) throw new RuntimeException("Contract number is required");
        if (p.getStartDate() == null) throw new RuntimeException("Start date is required");
        if (p.getEndDate() == null) throw new RuntimeException("End date is required");

        if (p.getEndDate().isBefore(p.getStartDate())) throw new RuntimeException("End date must be after start date");
        if (p.getPossibleExtensionEndDate() != null && p.getPossibleExtensionEndDate().isBefore(p.getEndDate())) {
            throw new RuntimeException("Extension end date must be after end date");
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

    // folosit de endpointul admin
    public void deleteAny(Long projectId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        projectRepository.delete(p);
    }

    private String safe(String s) {
        if (s == null) return null;
        String v = s.trim();
        return v.isEmpty() ? null : v;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public Page<Project> searchAll(String q, Pageable pageable) {
        String query = (q == null) ? "" : q.trim();
        return projectRepository.searchAll(query, pageable);
    }
}
