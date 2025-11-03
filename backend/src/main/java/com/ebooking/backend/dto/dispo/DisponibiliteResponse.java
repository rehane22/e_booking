package com.ebooking.backend.dto.dispo;

import com.ebooking.backend.model.enums.JourSemaine;

public record DisponibiliteResponse(
        Long id,
        Long prestataireId,
        JourSemaine jourSemaine,
        String heureDebut,
        String heureFin,
        Long serviceId
) {}
