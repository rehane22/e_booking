package com.ebooking.backend.dto.admin;

import java.time.LocalDateTime;
import java.util.List;

public record AdminUserDetailResponse(
        Long id, String prenom, String nom, String email, String telephone,
        List<String> roles, String statut,
        LocalDateTime createdAt, LocalDateTime lastLoginAt
) {}
