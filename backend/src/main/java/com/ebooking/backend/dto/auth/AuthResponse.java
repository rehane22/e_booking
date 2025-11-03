package com.ebooking.backend.dto.auth;

import java.util.List;

public record AuthResponse(
        Long id,
        String email,
        List<String> roles,
        String accessToken,
        String tokenType,
        long expiresIn
) {
    public static AuthResponse of(Long id, String email, List<String> roles, String token, long expiresIn) {
        return new AuthResponse(id, email, roles, token, "Bearer", expiresIn);
    }
}
