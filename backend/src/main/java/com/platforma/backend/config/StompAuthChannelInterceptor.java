package com.platforma.backend.config;

import com.platforma.backend.auth.JwtService;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(acc.getCommand())) {
            String authHeader = first(acc.getNativeHeader("Authorization"));
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new MessagingException("Missing Authorization header");
            }

            String token = authHeader.substring("Bearer ".length()).trim();
            String email = jwtService.extractUsername(token);
            if (email == null || email.isBlank()) {
                throw new MessagingException("Invalid token");
            }

            var user = userRepository.findByEmail(email).orElseThrow();
            if (!jwtService.isValid(token, user)) {
                throw new MessagingException("Invalid token");
            }

            // IMPORTANT: pentru /user/queue/** Spring folosește Principal.getName()
            acc.setUser(() -> email);
        }

        return message;
    }

    private String first(List<String> values) {
        return (values == null || values.isEmpty()) ? null : values.get(0);
    }
}
