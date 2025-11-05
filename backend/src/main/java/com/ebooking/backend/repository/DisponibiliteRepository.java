package com.ebooking.backend.repository;

import com.ebooking.backend.model.Disponibilite;
import com.ebooking.backend.model.enums.JourSemaine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalTime;
import java.util.List;

public interface DisponibiliteRepository extends JpaRepository<Disponibilite, Long> {

    List<Disponibilite> findByPrestataireId(Long prestataireId);

    List<Disponibilite> findByPrestataireIdAndJourSemaine(Long prestataireId, JourSemaine jour);

    List<Disponibilite> findByJourSemaine(JourSemaine jour);

    /* ---- Vérifier si un horaire est couvert par un créneau (général OU spécifique(serviceId)) ---- */
    @Query("""
           select d from Disponibilite d
           where d.prestataire.id = :prestataireId
             and d.jourSemaine = :jour
             and (d.service is null or d.service.id = :serviceId)
             and d.heureDebut <= :heure
             and :heure < d.heureFin
           """)
    List<Disponibilite> findCoveringSlot(Long prestataireId, JourSemaine jour, Long serviceId, LocalTime heure);

    /* ---- Détection d'overlap (anti-chevauchement) ---- */

    // 1) Overlap avec des créneaux GÉNÉRAUX existants (service IS NULL)
    @Query("""
           select d from Disponibilite d
           where d.prestataire.id = :prestataireId
             and d.jourSemaine = :jour
             and d.service is null
             and not (d.heureFin <= :heureDebut or d.heureDebut >= :heureFin)
           """)
    List<Disponibilite> findOverlapsWithGenerals(Long prestataireId, JourSemaine jour,
                                                 LocalTime heureDebut, LocalTime heureFin);

    // 2) Overlap avec des créneaux SPÉCIFIQUES du même service
    @Query("""
           select d from Disponibilite d
           where d.prestataire.id = :prestataireId
             and d.jourSemaine = :jour
             and d.service.id = :serviceId
             and not (d.heureFin <= :heureDebut or d.heureDebut >= :heureFin)
           """)
    List<Disponibilite> findOverlapsWithSpecific(Long prestataireId, JourSemaine jour, Long serviceId,
                                                 LocalTime heureDebut, LocalTime heureFin);

    // 3) Overlap GÉNÉRAL ↔ SPÉCIFIQUE(any)
    @Query("""
           select d from Disponibilite d
           where d.prestataire.id = :prestataireId
             and d.jourSemaine = :jour
             and d.service is not null
             and not (d.heureFin <= :heureDebut or d.heureDebut >= :heureFin)
           """)
    List<Disponibilite> findOverlapsWithAnySpecific(Long prestataireId, JourSemaine jour,
                                                    LocalTime heureDebut, LocalTime heureFin);
}
