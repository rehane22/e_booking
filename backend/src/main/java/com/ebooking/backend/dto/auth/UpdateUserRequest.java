package com.ebooking.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserRequest(
        @NotBlank String prenom,
        @NotBlank String nom,
        String telephone
) {}
