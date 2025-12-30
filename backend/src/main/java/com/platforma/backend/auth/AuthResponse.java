package com.platforma.backend.auth;

import lombok.Getter;

@Getter
public class AuthResponse {

    private final String token;
    private final UserDto user;

    public AuthResponse(String token, UserDto user) {
        this.token = token;
        this.user = user;
    }
}
