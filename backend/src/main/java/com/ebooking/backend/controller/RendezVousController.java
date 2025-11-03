package com.ebooking.backend.controller;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.dto.rdv.RendezVousResponse;
import com.ebooking.backend.security.CurrentUser;
import com.ebooking.backend.service.RendezVousService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/rendezvous") // pas de /api ici
public class RendezVousController {

    private final RendezVousService rdvService;

    // Créer un RDV (CLIENT/PRO/ADMIN)
    @PostMapping
    public ResponseEntity<RendezVousResponse> create(@Valid @RequestBody RendezVousRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.create(uid, req));
    }

    // Lister mes RDV (owner ou ADMIN)
    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<RendezVousResponse>> listByClient(@PathVariable Long clientId) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.listByClient(uid, clientId));
    }

    // Lister TOUS les RDV du prestataire (owner PRO ou ADMIN), SANS paramètre date
    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @GetMapping(value = "/prestataire/{prestataireId}", params = "!date")
    public ResponseEntity<List<RendezVousResponse>> listByPrestataire(@PathVariable Long prestataireId) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.listByPrestataire(uid, prestataireId));
    }

    // Lister les RDV du prestataire POUR UNE DATE précise (owner PRO ou ADMIN), AVEC paramètre date
    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @GetMapping(value = "/prestataire/{prestataireId}", params = "date")
    public ResponseEntity<List<RendezVousResponse>> listByPrestataireAndDate(
            @PathVariable Long prestataireId,
            @RequestParam String date
    ) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.listByPrestataireAndDate(uid, prestataireId, date));
    }

    // Confirmer (PRO owner ou ADMIN)
    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @PatchMapping("/{id}/confirmer")
    public ResponseEntity<RendezVousResponse> confirmer(@PathVariable Long id) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.confirmer(uid, id));
    }

    // Annuler (CLIENT owner, PRO owner, ADMIN)
    @PatchMapping("/{id}/annuler")
    public ResponseEntity<RendezVousResponse> annuler(@PathVariable Long id) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.annuler(uid, id));
    }
}
