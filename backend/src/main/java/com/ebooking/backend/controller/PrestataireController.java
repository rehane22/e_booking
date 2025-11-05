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
@RequestMapping("/prestataires")
public class PrestataireController {
    private final PrestataireServiceBiz prestataireService;

    @PreAuthorize("hasRole('PRO')")
    @PostMapping("/onboarding")
    public ResponseEntity<PrestataireResponse> onboarding(@Valid @RequestBody PrestataireOnboardingRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(prestataireService.onboard(uid, req));
    }

    @PreAuthorize("hasRole('PRO')")
    @GetMapping("/me")
    public ResponseEntity<PrestataireResponse> me() {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(prestataireService.getMine(uid));
    }

    @PreAuthorize("hasRole('PRO')")
    @PostMapping("/{prestataireId}/services/{serviceId}")
    public ResponseEntity<PrestataireResponse> link(@PathVariable Long prestataireId, @PathVariable Long serviceId) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(prestataireService.linkService(prestataireId, serviceId, uid));
    }

    @PreAuthorize("hasRole('PRO')")
    @DeleteMapping("/{prestataireId}/services/{serviceId}")
    public ResponseEntity<Void> unlink(@PathVariable Long prestataireId, @PathVariable Long serviceId) {
        Long uid = CurrentUser.id();
        prestataireService.unlinkService(prestataireId, serviceId, uid);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<?> listAll() {
        return ResponseEntity.ok(prestataireService.listAll());
    }

    /**
     * ✅ Liste filtrée par serviceId (désambiguïsation via params="serviceId")
     */
    @GetMapping(params = "serviceId")
    public ResponseEntity<?> listByService(@RequestParam("serviceId") Long serviceId) {
        return ResponseEntity.ok(prestataireService.listByService(serviceId));
    }

    /**
     * Détail public
     */
    @GetMapping("/{id}")
    public ResponseEntity<PrestataireResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(prestataireService.getPublic(id));
    }
}