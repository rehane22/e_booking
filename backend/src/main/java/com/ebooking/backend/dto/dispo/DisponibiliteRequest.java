package com.ebooking.backend.dto.dispo;

import com.ebooking.backend.model.enums.JourSemaine;
import jakarta.validation.constraints.*;

public record DisponibiliteRequest(
        @NotNull Long prestataireId,
        @NotNull JourSemaine jourSemaine,
        @NotNull String heureDebut,  // "HH:mm"
        @NotNull String heureFin,    // "HH:mm"
        Long serviceId               // null = créneau général
) {}
