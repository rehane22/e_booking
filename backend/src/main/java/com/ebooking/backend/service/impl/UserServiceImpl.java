package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.auth.UpdateUserRequest;
import com.ebooking.backend.dto.auth.UserResponse;
import com.ebooking.backend.model.User;
import com.ebooking.backend.model.enums.Role;
import com.ebooking.backend.repository.UserRepository;
import com.ebooking.backend.repository.UserRoleRepository;
import com.ebooking.backend.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepo;
    private final UserRoleRepository userRoleRepo;

    private boolean isAdmin(Long userId) {
        return userRoleRepo.existsByUserIdAndRole(userId, Role.ADMIN);
    }
    private void ensureOwnerOrAdmin(Long requesterId, Long targetUserId) {
        if (requesterId == null) throw new AccessDeniedException("Utilisateur non authentifié");
        if (!requesterId.equals(targetUserId) && !isAdmin(requesterId)) {
            throw new AccessDeniedException("Accès refusé");
        }
    }

    @Transactional(readOnly = true)
    @Override
    public UserResponse getById(Long requesterId, Long id) {
        ensureOwnerOrAdmin(requesterId, id);
        User u = userRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable"));
        var roles = userRoleRepo.findByUserId(u.getId()).stream().map(r -> r.getRole().name()).toList();
        return new UserResponse(u.getId(), u.getPrenom(), u.getNom(), u.getEmail(), u.getTelephone(), u.getStatut().name(), roles);
    }

    @Override
    public UserResponse updateById(Long requesterId, Long id, UpdateUserRequest req) {
        ensureOwnerOrAdmin(requesterId, id);
        User u = userRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable"));

        u.setPrenom(req.prenom().trim());
        u.setNom(req.nom().trim());
        u.setTelephone(req.telephone() == null ? null : req.telephone().trim());

        // email / roles / statut -> non modifiables ici
        u = userRepo.save(u);

        var roles = userRoleRepo.findByUserId(u.getId()).stream().map(r -> r.getRole().name()).toList();
        return new UserResponse(u.getId(), u.getPrenom(), u.getNom(), u.getEmail(), u.getTelephone(), u.getStatut().name(), roles);
    }

    @Override
    public void deleteById(Long requesterId, Long id) {
        ensureOwnerOrAdmin(requesterId, id);
        if (!userRepo.existsById(id)) throw new EntityNotFoundException("Utilisateur introuvable");
        userRepo.deleteById(id);
    }
}
