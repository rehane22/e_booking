package com.ebooking.backend.controller;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.dto.rdv.RendezVousResponse;
import com.ebooking.backend.dto.rdv.RendezVousUpdateRequest;
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
@RequestMapping("/rendezvous")
public class RendezVousController {
    private final RendezVousService rdvService;

 
    @PostMapping
    public ResponseEntity<RendezVousResponse> create(@Valid @RequestBody RendezVousRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.create(uid, req));
    }

     @GetMapping("/client/{clientId}")
    public ResponseEntity<List<RendezVousResponse>> listByClient(@PathVariable Long clientId) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.listByClient(uid, clientId));
    }


    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @GetMapping(value = "/prestataire/{prestataireId}", params = "!date")
    public ResponseEntity<List<RendezVousResponse>> listByPrestataire(@PathVariable Long prestataireId) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.listByPrestataire(uid, prestataireId));
    }


    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @GetMapping(value = "/prestataire/{prestataireId}", params = "date")
    public ResponseEntity<List<RendezVousResponse>> listByPrestataireAndDate(@PathVariable Long prestataireId, @RequestParam String date) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.listByPrestataireAndDate(uid, prestataireId, date));
    }


    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @PatchMapping("/{id}/confirmer")
    public ResponseEntity<RendezVousResponse> confirmer(@PathVariable Long id) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.confirmer(uid, id));
    }


    @PatchMapping("/{id}/annuler")
    public ResponseEntity<RendezVousResponse> annuler(@PathVariable Long id) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.annuler(uid, id));
    }

  
    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @PatchMapping("/{id}/refuser")
    public ResponseEntity<RendezVousResponse> refuser(@PathVariable Long id) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.refuser(uid, id));
    }


    @PreAuthorize("hasAnyRole('PRO','ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<RendezVousResponse> update(@PathVariable Long id, @RequestBody RendezVousUpdateRequest req) {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(rdvService.update(uid, id, req));
    }
}