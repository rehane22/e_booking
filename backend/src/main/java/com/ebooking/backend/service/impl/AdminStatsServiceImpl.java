package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.admin.*;
import com.ebooking.backend.model.Disponibilite;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.UserStatus;
import com.ebooking.backend.repository.*;
import com.ebooking.backend.service.AdminStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminStatsServiceImpl implements AdminStatsService {

    private final UserRepository userRepo;
    private final RendezVousRepository rdvRepo;
    private final DisponibiliteRepository dispoRepo;

    @Override
    public StatsSummaryResponse summary(LocalDate from, LocalDate to) {
        long totalUsers   = userRepo.count();
        long activeUsers  = userRepo.searchAdmin(null, UserStatus.ACTIF, Pageable.unpaged()).getTotalElements();
        long blockedUsers = userRepo.searchAdmin(null, UserStatus.BLOQUE, Pageable.unpaged()).getTotalElements();

        long totalRdv = rdvRepo.countByDateBetween(from, to);
        long todayRdv = rdvRepo.countByDate(LocalDate.now());

        // Occupancy rate (approx) : RDV / slots potentiels * 100
        long potentialSlots = countPotentialSlots(from, to, 30); // step 30 min
        double occupancy = potentialSlots == 0 ? 0d : Math.min(100d, (totalRdv * 100.0) / potentialSlots);

        // Lead time moyen : nécessite RendezVous.createdAt (sinon null)
        Double avgLead = null; // à implémenter si tu ajoutes createdAt

        return new StatsSummaryResponse(from.toString(), to.toString(),
                totalUsers, activeUsers, blockedUsers,
                totalRdv, todayRdv, round1(occupancy), avgLead);
    }

    @Override
    public List<SeriesPointResponse> series(String metric, LocalDate from, LocalDate to, String period) {
        if ("rdv_count".equals(metric)) {
            if ("weekly".equalsIgnoreCase(period)) {
                var rows = rdvRepo.countGroupedByWeek(from, to);
                List<SeriesPointResponse> out = new ArrayList<>();
                for (Object[] r : rows) {
                    out.add(new SeriesPointResponse((String) r[0], ((Number) r[1]).longValue()));
                }
                return out;
            } else {
                var rows = rdvRepo.countGroupedByDate(from, to);
                List<SeriesPointResponse> out = new ArrayList<>();
                for (Object[] r : rows) {
                    out.add(new SeriesPointResponse(r[0].toString(), ((Number) r[1]).longValue()));
                }
                return out;
            }
        } else if ("occupancy_rate".equals(metric)) {
            // Série quotidienne d'occupation (approx) : rdv_count(day) / potential_slots(day)
            List<SeriesPointResponse> out = new ArrayList<>();
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                long rdvDay = rdvRepo.countByDate(d);
                long slotsDay = countPotentialSlots(d, d, 30);
                long value = (long) Math.round(slotsDay == 0 ? 0 : (rdvDay * 100.0 / slotsDay));
                out.add(new SeriesPointResponse(d.toString(), value));
            }
            return out;
        }
        return List.of();
    }

    // --- Helpers

    private long countPotentialSlots(LocalDate from, LocalDate to, int stepMinutes) {
        long total = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            var jour = toJour(d.getDayOfWeek());
            List<Disponibilite> ds = dispoRepo.findByJourSemaine(jour);
            for (Disponibilite dispo : ds) {
                long minutes = Duration.between(dispo.getHeureDebut(), dispo.getHeureFin()).toMinutes();
                if (minutes > 0) total += (minutes / stepMinutes);
            }
        }
        return total;
    }

    private JourSemaine toJour(DayOfWeek dow) {
        return switch (dow) {
            case MONDAY -> JourSemaine.LUNDI;
            case TUESDAY -> JourSemaine.MARDI;
            case WEDNESDAY -> JourSemaine.MERCREDI;
            case THURSDAY -> JourSemaine.JEUDI;
            case FRIDAY -> JourSemaine.VENDREDI;
            case SATURDAY -> JourSemaine.SAMEDI;
            case SUNDAY -> JourSemaine.DIMANCHE;
        };
    }

    private double round1(double v) { return Math.round(v * 10.0) / 10.0; }
}
