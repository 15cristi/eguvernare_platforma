package com.platforma.backend.connections;

import com.platforma.backend.connections.dto.ConnectionRequestDto;
import com.platforma.backend.connections.dto.ConnectedProfileDto;
import com.platforma.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class ConnectionsController {

    private final ConnectionsService connectionsService;

    @PostMapping("/request/{userId}")
    public void request(@AuthenticationPrincipal User currentUser, @PathVariable Long userId) {
        connectionsService.requestConnection(currentUser, userId);
    }

    @GetMapping("/requests/incoming")
    public List<ConnectionRequestDto> incoming(@AuthenticationPrincipal User currentUser) {
        return connectionsService.incoming(currentUser);
    }

    @PostMapping("/requests/{id}/accept")
    public void accept(@AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        connectionsService.accept(currentUser, id);
    }

    @PostMapping("/requests/{id}/reject")
    public void reject(@AuthenticationPrincipal User currentUser, @PathVariable Long id) {
        connectionsService.reject(currentUser, id);
    }

    @GetMapping
    public List<ConnectedProfileDto> connections(@AuthenticationPrincipal User currentUser) {
        return connectionsService.connections(currentUser);
    }
}
