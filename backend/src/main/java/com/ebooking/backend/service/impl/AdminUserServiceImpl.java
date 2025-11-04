package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.admin.*;
import com.ebooking.backend.model.User;
import com.ebooking.backend.model.enums.Role;
import com.ebooking.backend.model.enums.UserStatus;
import com.ebooking.backend.repository.UserRepository;
import com.ebooking.backend.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepo;

    @Override
    @Transactional(readOnly = true)
    public Page<AdminUserItemResponse> list(String query, String statusStr, int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        UserStatus status = parseStatus(statusStr);
        var p = userRepo.searchAdmin(query, status, pageable);
        return p.map(this::toItem);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserDetailResponse get(Long id) {
        var u = userRepo.findById(id).orElseThrow();
        return toDetail(u);
    }

    @Override
    public void activate(Long id) {
        var u = userRepo.findById(id).orElseThrow();
        u.setStatut(UserStatus.ACTIF);
        userRepo.save(u);
    }

    @Override
    public void block(Long id) {
        User u = userRepo.findById(id).orElseThrow();
        u.setStatut(UserStatus.BLOQUE);
        userRepo.save(u);
    }

    private AdminUserItemResponse toItem(User u) {
        return new AdminUserItemResponse(
                u.getId(), u.getPrenom(), u.getNom(), u.getEmail(),
                u.getRoles().stream()
                        .map(ur -> ur.getRole())      // UserRole -> Role
                        .map(Role::name)              // Role -> String
                        .collect(Collectors.toList()),
                u.getStatut().name(), u.getCreatedAt(), u.getLastLoginAt()
        );
    }

    private AdminUserDetailResponse toDetail(User u) {
        return new AdminUserDetailResponse(
                u.getId(), u.getPrenom(), u.getNom(), u.getEmail(), u.getTelephone(),
                u.getRoles().stream()
                        .map(ur -> ur.getRole())      // UserRole -> Role
                        .map(Role::name)              // Role -> String
                        .collect(Collectors.toList()),
                u.getStatut().name(), u.getCreatedAt(), u.getLastLoginAt()
        );
    }

    private Sort parseSort(String s) {
        if (s == null || s.isBlank()) return Sort.by(Sort.Direction.DESC, "createdAt");
        String[] parts = s.split(",");
        String field = parts[0];
        Sort.Direction dir = parts.length > 1 && "ASC".equalsIgnoreCase(parts[1]) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, field);
    }

    private UserStatus parseStatus(String s) {
        if (s == null || s.equalsIgnoreCase("ALL")) return null;
        try { return UserStatus.valueOf(s); } catch (Exception e) { return null; }
    }
}
