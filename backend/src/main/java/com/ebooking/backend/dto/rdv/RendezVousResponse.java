package com.ebooking.backend.dto.rdv;

public record RendezVousResponse(
        Long id,
        Long serviceId,
        Long prestataireId,
        Long clientId,
        String date, 
        String heure, 
        String statut, 
        Integer dureeMin 
) { }