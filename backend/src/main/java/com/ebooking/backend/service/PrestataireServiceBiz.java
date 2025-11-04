package com.ebooking.backend.service;

import com.ebooking.backend.dto.prestataire.PrestataireOnboardingRequest;
import com.ebooking.backend.dto.prestataire.PrestataireResponse;

import java.util.List;

public interface PrestataireServiceBiz {
    PrestataireResponse onboard(Long currentUserId, PrestataireOnboardingRequest req);
    PrestataireResponse getMine(Long currentUserId);
    PrestataireResponse linkService(Long prestataireId, Long serviceId, Long currentUserId);
    void unlinkService(Long prestataireId, Long serviceId, Long currentUserId);
    List<PrestataireResponse> listByService(Long serviceId);
    PrestataireResponse getPublic(Long prestataireId);
    List<PrestataireResponse> listAll();
}
