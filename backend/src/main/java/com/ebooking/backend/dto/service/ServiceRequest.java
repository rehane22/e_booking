package com.ebooking.backend.dto.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ServiceRequest(
        @NotBlank @Size(max = 100) String nom,
        @Size(max = 10_000) String description
) {}
