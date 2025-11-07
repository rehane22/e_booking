package com.ebooking.backend.dto.rdv;

import jakarta.validation.constraints.NotNull;

public record RendezVousRequest(
        @NotNull Long serviceId,
        @NotNull Long prestataireId,
        @NotNull String date, 
        @NotNull String heure, 
        Integer dureeMin)
{ }