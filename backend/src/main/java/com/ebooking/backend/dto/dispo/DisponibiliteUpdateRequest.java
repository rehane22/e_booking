
package com.ebooking.backend.dto.dispo;

import com.ebooking.backend.model.enums.JourSemaine;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record DisponibiliteUpdateRequest(
        @NotNull JourSemaine jourSemaine,
        @NotNull @Pattern(regexp="^\\d{2}:\\d{2}$") String heureDebut,
        @NotNull @Pattern(regexp="^\\d{2}:\\d{2}$") String heureFin,
        Long serviceId
) {}
