package com.ebooking.backend.dto.rdv;

public record RendezVousResponse(
        Long id,
        Long serviceId,
        Long prestataireId,
        Long clientId,
        String date, // "YYYY-MM-DD"
        String heure, // "HH:mm"
        String statut, // EN_ATTENTE | CONFIRME | ANNULE | REFUSE
        Integer dureeMin // optionnel si ServiceCatalog possède dureeMin
) { }