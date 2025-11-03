package com.ebooking.backend.service;

import com.ebooking.backend.dto.dispo.DisponibiliteRequest;
import com.ebooking.backend.dto.dispo.DisponibiliteResponse;

import java.util.List;

public interface DisponibiliteService {
    List<DisponibiliteResponse> listByPrestataire(Long prestataireId);
    DisponibiliteResponse create(Long currentUserId, DisponibiliteRequest req);
    DisponibiliteResponse update(Long currentUserId, Long dispoId, DisponibiliteRequest req);
    void delete(Long currentUserId, Long dispoId);
    List<String> slotsForDate(Long prestataireId, Long serviceId, String dateIso, Integer stepMinutes);
}
