package com.ebooking.backend.repository;

import com.ebooking.backend.model.RendezVous;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface RendezVousRepository extends JpaRepository<RendezVous, Long> {

    boolean existsByPrestataireIdAndDateAndHeure(Long prestataireId, LocalDate date, LocalTime heure);

    List<RendezVous> findByClientIdOrderByDateAscHeureAsc(Long clientId);

    List<RendezVous> findByPrestataireIdOrderByDateAscHeureAsc(Long prestataireId);

    List<RendezVous> findByPrestataireIdAndDateOrderByHeureAsc(Long prestataireId, LocalDate date);

    long countByDateBetween(LocalDate from, LocalDate to);
    long countByDate(LocalDate day);

    // Série quotidienne (PostgreSQL-friendly)
    @Query("""
        SELECT r.date, COUNT(r) FROM RendezVous r
        WHERE r.date BETWEEN :from AND :to
        GROUP BY r.date
        ORDER BY r.date ASC
    """)
    List<Object[]> countGroupedByDate(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Série hebdo (date_trunc Postgres)
    @Query(value = """
        SELECT to_char(date_trunc('week', date), 'IYYY-IW') AS week, COUNT(*) AS c
        FROM rendez_vous
        WHERE date BETWEEN :from AND :to
        GROUP BY date_trunc('week', date)
        ORDER BY date_trunc('week', date)
    """, nativeQuery = true)
    List<Object[]> countGroupedByWeek(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
