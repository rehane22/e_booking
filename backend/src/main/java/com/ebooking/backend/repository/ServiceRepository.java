package com.ebooking.backend.repository;

import com.ebooking.backend.model.ServiceCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ServiceRepository extends JpaRepository<ServiceCatalog, Long> {

    boolean existsByNomIgnoreCase(String nom);

    Optional<ServiceCatalog> findByNomIgnoreCase(String nom);

    boolean existsByNomIgnoreCaseAndIdNot(String nom, Long id);
}
