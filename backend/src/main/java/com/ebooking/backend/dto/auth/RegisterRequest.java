package com.ebooking.backend.dto.auth;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(max = 50) String prenom,
        @NotBlank @Size(max = 50) String nom,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Size(max = 20) String telephone,
        @NotBlank @Size(min = 8, max = 100) String password,
        boolean isPro
) {}
