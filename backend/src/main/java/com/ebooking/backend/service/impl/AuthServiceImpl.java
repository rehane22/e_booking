package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.auth.*;
import com.ebooking.backend.model.User;
import com.ebooking.backend.model.UserRole;
import com.ebooking.backend.model.enums.Role;
import com.ebooking.backend.model.enums.UserStatus;
import com.ebooking.backend.repository.UserRepository;
import com.ebooking.backend.repository.UserRoleRepository;
import com.ebooking.backend.security.JwtTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements com.ebooking.backend.service.AuthService {

    private final UserRepository userRepo;
    private final UserRoleRepository roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    @Override
    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmailIgnoreCase(req.email())) {
            throw new EntityExistsException("Email déjà utilisé");
        }
        if (userRepo.existsByTelephone(req.telephone())) {
            throw new EntityExistsException("Téléphone déjà utilisé");
        }
        User user = User.builder()
                .prenom(req.prenom().trim())
                .nom(req.nom().trim())
                .email(req.email().trim())
                .telephone(req.telephone().trim())
                .motDePasseHash(passwordEncoder.encode(req.password()))
                .statut(UserStatus.ACTIF)
                .build();
        user = userRepo.save(user);
        UserRole rClient = UserRole.builder().user(user).role(Role.CLIENT).build();
        roleRepo.save(rClient);
        if (req.isPro()) {
            UserRole rPro = UserRole.builder().user(user).role(Role.PRO).build();
            roleRepo.save(rPro);
        }

       
        user.setRoles(roleRepo.findByUserId(user.getId()));

        String token = jwtTokenService.generateAccessToken(user);
        List<String> roles = user.getRoles().stream().map(ur -> ur.getRole().name()).toList();
        long expiresIn = jwtTokenService.getExpiresInSeconds();
        return AuthResponse.of(user.getId(), user.getEmail(), roles, token, expiresIn);
    }

    @Override
    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> new EntityNotFoundException("Identifiants invalides"));
        if (!passwordEncoder.matches(req.password(), user.getMotDePasseHash())) {
            throw new EntityNotFoundException("Identifiants invalides");
        }
        if (user.getStatut() == UserStatus.BLOQUE) {
            throw new IllegalStateException("Compte bloqué");
        }
        user.setRoles(roleRepo.findByUserId(user.getId()));
        String token = jwtTokenService.generateAccessToken(user);
        List<String> roles = user.getRoles().stream().map(ur -> ur.getRole().name()).toList();
        long expiresIn = jwtTokenService.getExpiresInSeconds();
        return AuthResponse.of(user.getId(), user.getEmail(), roles, token, expiresIn);
    }

    @Override
    public UserResponse me(Long currentUserId) {
        if (currentUserId == null) throw new EntityNotFoundException("Utilisateur non authentifié");
        User user = userRepo.findById(currentUserId).orElseThrow(
                () -> new EntityNotFoundException("Utilisateur introuvable")
        );
        List<String> roles = roleRepo.findByUserId(user.getId()).stream()
                .map(r -> r.getRole().name()).toList();
        return new UserResponse(
                user.getId(),
                user.getPrenom(),
                user.getNom(),
                user.getEmail(),
                user.getTelephone(),
                user.getStatut().name(),
                roles
        );
    }


}
