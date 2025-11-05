package com.ebooking.backend.repository;

import com.ebooking.backend.model.PrestataireService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrestataireServiceRepository extends JpaRepository<PrestataireService, Long> {
    boolean existsByPrestataireIdAndServiceId(Long prestataireId, Long serviceId);

    void deleteByPrestataireIdAndServiceId(Long prestataireId, Long serviceId);

    List<PrestataireService> findByPrestataireId(Long prestataireId);
}