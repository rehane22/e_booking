package com.ebooking.backend.controller;

import com.ebooking.backend.dto.admin.*;
import com.ebooking.backend.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService service;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String query,
                                  @RequestParam(defaultValue = "ALL") String status,
                                  @RequestParam(defaultValue = "ALL") String role,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(defaultValue = "createdAt,DESC") String sort) {
        Page<AdminUserItemResponse> p = service.list(query, status, role, "ADMIN", page, size, sort);
        return ResponseEntity.ok(
                java.util.Map.of("items", p.getContent(), "total", p.getTotalElements())
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserDetailResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable Long id) {
        service.activate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<Void> block(@PathVariable Long id) {
        service.block(id);
        return ResponseEntity.noContent().build();
    }
}
