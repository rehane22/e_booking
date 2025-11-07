package com.ebooking.backend.dto.prestataire;

import com.ebooking.backend.dto.service.ServiceResponse;

import java.util.List;

public record PrestataireResponse(
        Long id,
        Long userId,
        String prenom,  
        String nom,
        String specialite,
        String adresse,
        List<ServiceResponse> services
) {}
