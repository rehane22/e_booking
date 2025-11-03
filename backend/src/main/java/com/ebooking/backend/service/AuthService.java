package com.ebooking.backend.service;

import com.ebooking.backend.dto.auth.*;

public interface AuthService {
    AuthResponse register(RegisterRequest req);
    AuthResponse login(LoginRequest req);
    UserResponse me(Long currentUserId);
}
