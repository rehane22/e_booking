package com.ebooking.backend.dto.prestataire;

import jakarta.validation.constraints.Size;
import java.util.List;

public record PrestataireOnboardingRequest(
        @Size(max = 100) String specialite,
        String adresse,
        List<Long> serviceIds
) {}
