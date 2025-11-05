package com.ebooking.backend.dto.rdv;

/** PATCH partiel : serviceId/date/heure sont optionnels */
public record RendezVousUpdateRequest(
        Long serviceId,
        String date,
        String heure
) {}
