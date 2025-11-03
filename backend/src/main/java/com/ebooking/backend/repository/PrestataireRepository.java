package com.ebooking.backend.repository;

import com.ebooking.backend.model.Prestataire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PrestataireRepository extends JpaRepository<Prestataire, Long> {

    Optional<Prestataire> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    @Query("""
           select p
           from Prestataire p
           join com.ebooking.backend.model.PrestataireService ps on ps.prestataire.id = p.id
           where ps.service.id = :serviceId
           """)
    List<Prestataire> findByServiceId(Long serviceId);
}
