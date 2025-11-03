package com.ebooking.backend.dto.auth;

import java.util.List;

public record UserResponse(
        Long id,
        String prenom,
        String nom,
        String email,
        String telephone,
        String statut,
        List<String> roles
) {}
