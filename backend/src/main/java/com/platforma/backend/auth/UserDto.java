package com.platforma.backend.auth;

import com.platforma.backend.user.User;
import lombok.Getter;

@Getter
public class UserDto {

    private final String firstName;
    private final String lastName;
    private final String role;
    private final String email;

    public UserDto(User user) {
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.role = user.getRole().name();
        this.email = user.getUsername();
    }
}
