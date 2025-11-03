package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.prestataire.PrestataireOnboardingRequest;
import com.ebooking.backend.dto.prestataire.PrestataireResponse;
import com.ebooking.backend.dto.service.ServiceResponse;
import com.ebooking.backend.model.Prestataire;
import com.ebooking.backend.model.PrestataireService;
import com.ebooking.backend.model.ServiceCatalog;
import com.ebooking.backend.model.User;
import com.ebooking.backend.repository.*;
import com.ebooking.backend.service.PrestataireServiceBiz;
import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class PrestataireServiceBizImpl implements PrestataireServiceBiz {

    private final PrestataireRepository prestataireRepo;
    private final PrestataireServiceRepository prestataireServiceRepo;
    private final ServiceRepository serviceRepo;
    private final UserRepository userRepo;

    @Override
    public PrestataireResponse onboard(Long currentUserId, PrestataireOnboardingRequest req) {
        User user = userRepo.findById(currentUserId)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable"));

        if (prestataireRepo.existsByUserId(user.getId())) {
            throw new EntityExistsException("Profil prestataire déjà créé pour cet utilisateur");
        }

        Prestataire p = Prestataire.builder()
                .user(user)
                .specialite(req.specialite())
                .adresse(req.adresse())
                .build();
        p = prestataireRepo.save(p);

        // Lier les services fournis (si liste non vide)
        if (req.serviceIds() != null && !req.serviceIds().isEmpty()) {
            for (Long sid : req.serviceIds()) {
                ServiceCatalog sc = serviceRepo.findById(sid)
                        .orElseThrow(() -> new EntityNotFoundException("Service introuvable: id=" + sid));
                if (!prestataireServiceRepo.existsByPrestataireIdAndServiceId(p.getId(), sc.getId())) {
                    prestataireServiceRepo.save(PrestataireService.builder()
                            .prestataire(p)
                            .service(sc)
                            .build());
                }
            }
        }

        return toResponse(p);
    }

    @Transactional(readOnly = true)
    @Override
    public PrestataireResponse getMine(Long currentUserId) {
        Prestataire p = prestataireRepo.findByUserId(currentUserId)
                .orElseThrow(() -> new EntityNotFoundException("Profil prestataire introuvable"));
        return toResponse(p);
    }

    @Override
    public PrestataireResponse linkService(Long prestataireId, Long serviceId, Long currentUserId) {
        Prestataire p = prestataireRepo.findById(prestataireId)
                .orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        ensureOwner(p, currentUserId);

        ServiceCatalog sc = serviceRepo.findById(serviceId)
                .orElseThrow(() -> new EntityNotFoundException("Service introuvable"));

        if (!prestataireServiceRepo.existsByPrestataireIdAndServiceId(p.getId(), sc.getId())) {
            prestataireServiceRepo.save(PrestataireService.builder()
                    .prestataire(p)
                    .service(sc)
                    .build());
        }
        return toResponse(p);
    }

    @Override
    public void unlinkService(Long prestataireId, Long serviceId, Long currentUserId) {
        Prestataire p = prestataireRepo.findById(prestataireId)
                .orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        ensureOwner(p, currentUserId);

        if (!prestataireServiceRepo.existsByPrestataireIdAndServiceId(p.getId(), serviceId)) {
            throw new EntityNotFoundException("Lien prestataire-service introuvable");
        }
        prestataireServiceRepo.deleteByPrestataireIdAndServiceId(p.getId(), serviceId);
    }

    private void ensureOwner(Prestataire p, Long currentUserId) {
        if (!Objects.equals(p.getUser().getId(), currentUserId)) {
            throw new AccessDeniedException("Ce prestataire n'appartient pas à l'utilisateur courant");
        }
    }
    @Transactional(readOnly = true)
    @Override
    public List<PrestataireResponse> listByService(Long serviceId) {
        serviceRepo.findById(serviceId)
                .orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
        return prestataireRepo.findByServiceId(serviceId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public PrestataireResponse getPublic(Long prestataireId) {
        var p = prestataireRepo.findById(prestataireId)
                .orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        return toResponse(p);
    }

    private PrestataireResponse toResponse(Prestataire p) {
        var links = prestataireServiceRepo.findByPrestataireId(p.getId());
        var services = links.stream()
                .map(ps -> new ServiceResponse(ps.getService().getId(),
                        ps.getService().getNom(),
                        ps.getService().getDescription()))
                .toList();

        return new PrestataireResponse(
                p.getId(),
                p.getUser().getId(),
                p.getUser().getPrenom(), // <-- AJOUT
                p.getUser().getNom(),    // <-- AJOUT
                p.getSpecialite(),
                p.getAdresse(),
                services
        );

    }
}
