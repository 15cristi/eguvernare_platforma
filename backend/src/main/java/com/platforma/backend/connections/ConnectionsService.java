package com.platforma.backend.connections;

import com.platforma.backend.connections.dto.ConnectionNotificationDto;
import com.platforma.backend.connections.dto.ConnectionRequestDto;
import com.platforma.backend.connections.dto.ConnectedProfileDto;
import com.platforma.backend.profile.Profile;
import com.platforma.backend.profile.ProfileService;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import com.platforma.backend.ws.WsEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static com.platforma.backend.connections.ConnectionRequest.Status.*;

@Service
@RequiredArgsConstructor
public class ConnectionsService {

    private final ConnectionRequestRepository connectionRequestRepository;
    private final UserRepository userRepository;
    private final ProfileService profileService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ConnectionRequest requestConnection(User currentUser, Long otherUserId) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new IllegalArgumentException("Not authenticated");
        }
        if (otherUserId == null) {
            throw new IllegalArgumentException("Missing userId");
        }
        if (Objects.equals(currentUser.getId(), otherUserId)) {
            throw new IllegalArgumentException("You cannot connect to yourself");
        }

        User other = userRepository.findById(otherUserId).orElseThrow();

        // există deja request în direcția asta?
        Optional<ConnectionRequest> existing = connectionRequestRepository
                .findByRequester_IdAndAddressee_Id(currentUser.getId(), otherUserId);

        if (existing.isPresent()) {
            ConnectionRequest cr = existing.get();
            // dacă era rejected, îl readucem în pending
            if (cr.getStatus() == REJECTED) {
                cr.setStatus(PENDING);
                ConnectionRequest saved = connectionRequestRepository.save(cr);
                notifyUser(other.getEmail(), "CONNECTION_REQUEST", saved.getId(), currentUser.getId());
                return saved;
            }
            return cr; // PENDING sau ACCEPTED deja
        }

        // există request invers pending? atunci accept automat
        Optional<ConnectionRequest> reverse = connectionRequestRepository
                .findByRequester_IdAndAddressee_Id(otherUserId, currentUser.getId());

        if (reverse.isPresent() && reverse.get().getStatus() == PENDING) {
            ConnectionRequest cr = reverse.get();
            cr.setStatus(ACCEPTED);
            ConnectionRequest saved = connectionRequestRepository.save(cr);

            notifyUser(other.getEmail(), "CONNECTION_ACCEPTED", saved.getId(), currentUser.getId());
            notifyUser(currentUser.getEmail(), "CONNECTION_ACCEPTED", saved.getId(), otherUserId);

            return saved;
        }

        ConnectionRequest created = ConnectionRequest.builder()
                .requester(currentUser)
                .addressee(other)
                .status(PENDING)
                .build();

        ConnectionRequest saved = connectionRequestRepository.save(created);
        notifyUser(other.getEmail(), "CONNECTION_REQUEST", saved.getId(), currentUser.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ConnectionRequestDto> incoming(User currentUser) {
        Long me = currentUser.getId();
        List<ConnectionRequest> reqs = connectionRequestRepository.findIncomingPending(me);

        return reqs.stream().map(cr -> {
            User from = cr.getRequester();
            Profile p = profileService.getProfile(from.getId());

            return new ConnectionRequestDto(
                    cr.getId(),
                    from.getId(),
                    from.getFirstName(),
                    from.getLastName(),
                    from.getRole() == null ? null : from.getRole().name(),
                    p == null ? null : p.getAvatarUrl(),
                    cr.getCreatedAt()
            );
        }).collect(Collectors.toList());
    }

    @Transactional
    public void accept(User currentUser, Long requestId) {
        ConnectionRequest cr = connectionRequestRepository.findById(requestId).orElseThrow();
        if (!Objects.equals(cr.getAddressee().getId(), currentUser.getId())) {
            throw new IllegalArgumentException("Not allowed");
        }
        if (cr.getStatus() != PENDING) return;

        cr.setStatus(ACCEPTED);
        connectionRequestRepository.save(cr);

        notifyUser(cr.getRequester().getEmail(), "CONNECTION_ACCEPTED", cr.getId(), currentUser.getId());
        notifyUser(cr.getAddressee().getEmail(), "CONNECTION_ACCEPTED", cr.getId(), cr.getRequester().getId());
    }

    @Transactional
    public void reject(User currentUser, Long requestId) {
        ConnectionRequest cr = connectionRequestRepository.findById(requestId).orElseThrow();
        if (!Objects.equals(cr.getAddressee().getId(), currentUser.getId())) {
            throw new IllegalArgumentException("Not allowed");
        }
        if (cr.getStatus() != PENDING) return;

        cr.setStatus(REJECTED);
        connectionRequestRepository.save(cr);

        notifyUser(cr.getRequester().getEmail(), "CONNECTION_REJECTED", cr.getId(), currentUser.getId());
    }

    @Transactional(readOnly = true)
    public List<ConnectedProfileDto> connections(User currentUser) {
        Long me = currentUser.getId();
        List<ConnectionRequest> accepted = connectionRequestRepository.findAcceptedForUser(me);

        return accepted.stream().map(cr -> {
            User other = Objects.equals(cr.getRequester().getId(), me) ? cr.getAddressee() : cr.getRequester();
            Profile p = profileService.getProfile(other.getId());

            return new ConnectedProfileDto(
                    other.getId(),
                    other.getFirstName(),
                    other.getLastName(),
                    other.getRole() == null ? null : other.getRole().name(),
                    p == null ? null : p.getHeadline(),
                    p == null ? null : p.getAvatarUrl()
            );
        }).collect(Collectors.toList());
    }

    // folosit de matching ca să afișeze status pe card
    @Transactional(readOnly = true)
    public Map<Long, String> getStatusesForMatching(User currentUser, Collection<Long> otherUserIds) {
        Long me = currentUser.getId();
        if (otherUserIds == null || otherUserIds.isEmpty()) return Map.of();

        List<ConnectionRequest> all = connectionRequestRepository.findAllForUser(me);

        Map<Long, String> status = new HashMap<>();
        for (ConnectionRequest cr : all) {
            Long otherId = Objects.equals(cr.getRequester().getId(), me) ? cr.getAddressee().getId() : cr.getRequester().getId();
            if (!otherUserIds.contains(otherId)) continue;

            if (cr.getStatus() == ACCEPTED) {
                status.put(otherId, "CONNECTED");
            } else if (cr.getStatus() == PENDING) {
                if (Objects.equals(cr.getRequester().getId(), me)) status.put(otherId, "OUTGOING_PENDING");
                else status.put(otherId, "INCOMING_PENDING");
            } else {
                // REJECTED: în UI îl tratăm ca NONE
                if (!status.containsKey(otherId)) status.put(otherId, "NONE");
            }
        }

        // default NONE
        for (Long id : otherUserIds) status.putIfAbsent(id, "NONE");

        return status;
    }

    private void notifyUser(String userEmail, String kind, Long requestId, Long fromUserId) {
        if (userEmail == null || userEmail.isBlank()) return;

        ConnectionNotificationDto dto = new ConnectionNotificationDto(kind, requestId, fromUserId);
        messagingTemplate.convertAndSendToUser(
                userEmail,
                "/queue/notifications",
                new WsEvent("CONNECTION", dto)
        );
    }
}
