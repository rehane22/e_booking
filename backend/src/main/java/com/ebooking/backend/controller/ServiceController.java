package com.ebooking.backend.controller;

import com.ebooking.backend.dto.service.ServiceRequest;
import com.ebooking.backend.dto.service.ServiceResponse;
import com.ebooking.backend.service.ServiceCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/services") // ATTENTION: pas de /api ici
public class ServiceController {

    private final ServiceCatalogService serviceCatalogService;

    // Public
    @GetMapping
    public ResponseEntity<List<ServiceResponse>> findAll() {
        return ResponseEntity.ok(serviceCatalogService.findAll());
    }

    // ADMIN
    @PreAuthorize("hasAnyRole('ADMIN','PRO')")
    @PostMapping
    public ResponseEntity<ServiceResponse> create(@Valid @RequestBody ServiceRequest req) {
        ServiceResponse created = serviceCatalogService.create(req);
        return ResponseEntity.created(URI.create("/services/" + created.id())).body(created);
    }

    // ADMIN
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ServiceResponse> update(@PathVariable Long id,
                                                  @Valid @RequestBody ServiceRequest req) {
        return ResponseEntity.ok(serviceCatalogService.update(id, req));
    }

    // ADMIN
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceCatalogService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
