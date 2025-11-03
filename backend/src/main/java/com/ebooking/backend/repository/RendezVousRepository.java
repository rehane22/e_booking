package com.ebooking.backend.repository;

import com.ebooking.backend.model.RendezVous;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface RendezVousRepository extends JpaRepository<RendezVous, Long> {

    boolean existsByPrestataireIdAndDateAndHeure(Long prestataireId, LocalDate date, LocalTime heure);

    List<RendezVous> findByClientIdOrderByDateAscHeureAsc(Long clientId);

    List<RendezVous> findByPrestataireIdOrderByDateAscHeureAsc(Long prestataireId);

    List<RendezVous> findByPrestataireIdAndDateOrderByHeureAsc(Long prestataireId, LocalDate date);
}
