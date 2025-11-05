package com.ebooking.backend.service;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.dto.rdv.RendezVousResponse;
import com.ebooking.backend.dto.rdv.RendezVousUpdateRequest;

import java.util.List;

public interface RendezVousService {
    RendezVousResponse create(Long currentUserId, RendezVousRequest req);

    List<RendezVousResponse> listByClient(Long currentUserId, Long clientId);

    List<RendezVousResponse> listByPrestataire(Long currentUserId, Long prestataireId);

    List<RendezVousResponse> listByPrestataireAndDate(Long currentUserId, Long prestataireId, String date);

    RendezVousResponse confirmer(Long currentUserId, Long rdvId);

    RendezVousResponse annuler(Long currentUserId, Long rdvId);

    RendezVousResponse refuser(Long currentUserId, Long rdvId);

    RendezVousResponse update(Long currentUserId, Long rdvId, RendezVousUpdateRequest req);
}