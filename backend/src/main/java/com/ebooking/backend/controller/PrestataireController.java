package com.ebooking.backend.controller;

import com.ebooking.backend.dto.prestataire.PrestataireOnboardingRequest;
import com.ebooking.backend.dto.prestataire.PrestataireResponse;
import com.ebooking.backend.security.CurrentUser;
import com.ebooking.backend.service.PrestataireServiceBiz;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/prestataires") // pas de /api ici
public class PrestataireController {

    private final PrestataireServiceBiz prestataireService;

    // Création du profil prestataire (une seule fois) — réservé PRO
    @PreAuthorize("hasRole('PRO')")
    @PostMapping("/onboarding")
    public ResponseEntity<PrestataireResponse> onboarding(@Valid @RequestBody PrestataireOnboardingRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(prestataireService.onboard(uid, req));
    }

    // Récupérer mon profil prestataire — réservé PRO
    @PreAuthorize("hasRole('PRO')")
    @GetMapping("/me")
    public ResponseEntity<PrestataireResponse> me() {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(prestataireService.getMine(uid));
    }

    // Lier un service à mon profil — réservé PRO + owner
    @PreAuthorize("hasRole('PRO')")
    @PostMapping("/{prestataireId}/services/{serviceId}")
    public ResponseEntity<PrestataireResponse> link(@PathVariable Long prestataireId, @PathVariable Long serviceId) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(prestataireService.linkService(prestataireId, serviceId, uid));
    }

    // Délier un service — réservé PRO + owner
    @PreAuthorize("hasRole('PRO')")
    @DeleteMapping("/{prestataireId}/services/{serviceId}")
    public ResponseEntity<Void> unlink(@PathVariable Long prestataireId, @PathVariable Long serviceId) {
        Long uid = CurrentUser.id();
        prestataireService.unlinkService(prestataireId, serviceId, uid);
        return ResponseEntity.noContent().build();
    }

    // Public : lister les prestataires proposant un service donné
    @GetMapping
    public ResponseEntity<?> listByService(@RequestParam(name = "serviceId", required = false) Long serviceId) {
        if (serviceId == null) {
            // Si pas de param, on peut renvoyer 400 ou une liste vide/explicative. Ici 400.
            return ResponseEntity.badRequest().body(
                    java.util.Map.of("message", "Paramètre 'serviceId' requis")
            );
        }
        return ResponseEntity.ok(prestataireService.listByService(serviceId));
    }

    // Public : détail d’un prestataire (nom, prénom, spécialité, adresse, services)
    @GetMapping("/{id}")
    public ResponseEntity<PrestataireResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(prestataireService.getPublic(id));
    }
}
