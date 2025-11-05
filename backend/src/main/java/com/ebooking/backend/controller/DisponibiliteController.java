package com.ebooking.backend.controller;

import com.ebooking.backend.dto.dispo.DisponibiliteRequest;
import com.ebooking.backend.dto.dispo.DisponibiliteResponse;
import com.ebooking.backend.dto.dispo.DisponibiliteUpdateRequest;
import com.ebooking.backend.security.CurrentUser;
import com.ebooking.backend.service.DisponibiliteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/disponibilites") // <-- aligné avec le front
public class DisponibiliteController {

    private final DisponibiliteService dispoService;

    // Public : lister toutes les dispos d'un prestataire (tous jours)
    @GetMapping("/{prestataireId}")
    public ResponseEntity<List<DisponibiliteResponse>> list(@PathVariable Long prestataireId) {
        return ResponseEntity.ok(dispoService.listByPrestataire(prestataireId));
    }

    // PRO owner : create
    @PreAuthorize("hasRole('PRO')")
    @PostMapping
    public ResponseEntity<DisponibiliteResponse> create(@Valid @RequestBody DisponibiliteRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(dispoService.create(uid, req));
    }

    // PRO owner : update
    @PreAuthorize("hasRole('PRO')")
    @PutMapping("/{id}")
    public ResponseEntity<DisponibiliteResponse> update(@PathVariable Long id,
                                                        @Valid @RequestBody DisponibiliteUpdateRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(dispoService.update(uid, id, req));
    }

    // PRO owner : delete
    @PreAuthorize("hasRole('PRO')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long uid = CurrentUser.id();
        dispoService.delete(uid, id);
        return ResponseEntity.noContent().build();
    }

    // Public : slots
    @GetMapping("/{prestataireId}/slots")
    public ResponseEntity<List<String>> slots(
            @PathVariable Long prestataireId,
            @RequestParam String date,               // YYYY-MM-DD (requis)
            @RequestParam(required = false) Long serviceId, // optionnel
            @RequestParam(required = false) Integer step    // minutes (par défaut 30)
    ) {
        if (date == null || date.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paramètre 'date' requis (YYYY-MM-DD)");
        }
        return ResponseEntity.ok(dispoService.slotsForDate(prestataireId, serviceId, date, step));
    }
}
