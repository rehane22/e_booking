package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.dispo.DisponibiliteRequest;
import com.ebooking.backend.dto.dispo.DisponibiliteResponse;
import com.ebooking.backend.dto.dispo.DisponibiliteUpdateRequest;
import com.ebooking.backend.exception.UnprocessableEntityException;
import com.ebooking.backend.model.Disponibilite;
import com.ebooking.backend.model.Prestataire;
import com.ebooking.backend.model.RendezVous;
import com.ebooking.backend.model.ServiceCatalog;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.StatutRdv;
import com.ebooking.backend.repository.*;
import com.ebooking.backend.service.DisponibiliteService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class DisponibiliteServiceImpl implements DisponibiliteService {

    private final DisponibiliteRepository dispoRepo;
    private final PrestataireRepository prestataireRepo;
    private final ServiceRepository serviceRepo;
    private final PrestataireServiceRepository prestataireServiceRepo;
    private final RendezVousRepository rdvRepo;
    private static final int DEFAULT_DURATION_MINUTES = 60;

    @Transactional(readOnly = true)
    @Override
    public List<DisponibiliteResponse> listByPrestataire(Long prestataireId) {
        return dispoRepo.findByPrestataireId(prestataireId).stream()
                .map(this::toResp)
                .toList();
    }

    @Override
    public DisponibiliteResponse create(Long currentUserId, DisponibiliteRequest req) {
        Prestataire p = requirePrestataireOwner(req.prestataireId(), currentUserId);

        LocalTime debut = parse(req.heureDebut());
        LocalTime fin = parse(req.heureFin());
        if (!debut.isBefore(fin)) {
            throw new UnprocessableEntityException("heureDebut doit être < heureFin");
        }

        ServiceCatalog sc = null;
        if (req.serviceId() != null) {
            sc = serviceRepo.findById(req.serviceId())
                    .orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
            boolean linked = prestataireServiceRepo.existsByPrestataireIdAndServiceId(p.getId(), sc.getId());
            if (!linked) throw new UnprocessableEntityException("Ce prestataire n'offre pas ce service");
        }


        checkOverlapsOnCreate(p.getId(), req.jourSemaine(), debut, fin, sc);

        Disponibilite d = Disponibilite.builder()
                .prestataire(p)
                .service(sc) 
                .jourSemaine(req.jourSemaine())
                .heureDebut(debut)
                .heureFin(fin)
                .build();
        d = dispoRepo.save(d);
        return toResp(d);
    }

    @Override
    public DisponibiliteResponse update(Long currentUserId, Long dispoId, DisponibiliteUpdateRequest req) {
        var d = dispoRepo.findById(dispoId).orElseThrow(() -> new EntityNotFoundException("Disponibilité introuvable"));
        ensureOwner(d, currentUserId);

        Prestataire p = d.getPrestataire();

        LocalTime debut = parse(req.heureDebut());
        LocalTime fin = parse(req.heureFin());
        if (!debut.isBefore(fin)) {
            throw new UnprocessableEntityException("heureDebut doit être < heureFin");
        }

        ServiceCatalog sc = null;
        if (req.serviceId() != null) {
            sc = serviceRepo.findById(req.serviceId())
                    .orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
            boolean linked = prestataireServiceRepo.existsByPrestataireIdAndServiceId(p.getId(), sc.getId());
            if (!linked) throw new UnprocessableEntityException("Ce prestataire n'offre pas ce service");
        }
        checkOverlapsOnUpdate(p.getId(), req.jourSemaine(), debut, fin, sc, d.getId());

        d.setJourSemaine(req.jourSemaine());
        d.setHeureDebut(debut);
        d.setHeureFin(fin);
        d.setService(sc);
        return toResp(d);
    }

    @Override
    public void delete(Long currentUserId, Long dispoId) {
        Disponibilite d = dispoRepo.findById(dispoId)
                .orElseThrow(() -> new EntityNotFoundException("Disponibilité introuvable"));
        ensureOwner(d, currentUserId);
        dispoRepo.delete(d);
    }

    /* ----------------- Helpers ----------------- */

    private Prestataire requirePrestataireOwner(Long prestataireId, Long currentUserId) {
        Prestataire p = prestataireRepo.findById(prestataireId)
                .orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        if (!Objects.equals(p.getUser().getId(), currentUserId)) {
            throw new AccessDeniedException("Ce prestataire n'appartient pas à l'utilisateur courant");
        }
        return p;
    }

    private void ensureOwner(Disponibilite d, Long currentUserId) {
        if (!Objects.equals(d.getPrestataire().getUser().getId(), currentUserId)) {
            throw new AccessDeniedException("Ce créneau n'appartient pas à l'utilisateur courant");
        }
    }

    private LocalTime parse(String hhmm) {
        return LocalTime.parse(hhmm);
    }

    private void checkOverlapsOnCreate(Long prestataireId, JourSemaine jour, LocalTime debut, LocalTime fin, ServiceCatalog sc) {
        if (sc == null) {
            if (!dispoRepo.findOverlapsWithGenerals(prestataireId, jour, debut, fin).isEmpty()
                    || !dispoRepo.findOverlapsWithAnySpecific(prestataireId, jour, debut, fin).isEmpty()) {
                throw new UnprocessableEntityException("Chevauchement détecté avec un créneau existant (général/spécifique)");
            }
        } else {
            if (!dispoRepo.findOverlapsWithGenerals(prestataireId, jour, debut, fin).isEmpty()
                    || !dispoRepo.findOverlapsWithSpecific(prestataireId, jour, sc.getId(), debut, fin).isEmpty()) {
                throw new UnprocessableEntityException("Chevauchement détecté avec un créneau existant");
            }
        }
    }

    private void checkOverlapsOnUpdate(Long prestataireId, JourSemaine jour, LocalTime debut, LocalTime fin, ServiceCatalog sc, Long selfId) {
        if (sc == null) {
            var gens = dispoRepo.findOverlapsWithGenerals(prestataireId, jour, debut, fin)
                    .stream().filter(x -> !Objects.equals(x.getId(), selfId)).toList();
            var specs = dispoRepo.findOverlapsWithAnySpecific(prestataireId, jour, debut, fin)
                    .stream().filter(x -> !Objects.equals(x.getId(), selfId)).toList();
            if (!gens.isEmpty() || !specs.isEmpty()) {
                throw new UnprocessableEntityException("Chevauchement détecté avec un créneau existant");
            }
        } else {
            var gens = dispoRepo.findOverlapsWithGenerals(prestataireId, jour, debut, fin)
                    .stream().filter(x -> !Objects.equals(x.getId(), selfId)).toList();
            var specsSame = dispoRepo.findOverlapsWithSpecific(prestataireId, jour, sc.getId(), debut, fin)
                    .stream().filter(x -> !Objects.equals(x.getId(), selfId)).toList();
            if (!gens.isEmpty() || !specsSame.isEmpty()) {
                throw new UnprocessableEntityException("Chevauchement détecté avec un créneau existant");
            }
        }
    }

    @Transactional(readOnly = true)
    @Override
    public List<String> slotsForDate(Long prestataireId, Long serviceId, String dateIso, Integer stepMinutes, Integer dureeMinutes) {
        if (stepMinutes == null || stepMinutes <= 0) stepMinutes = 30;
        var date = LocalDate.parse(dateIso);
        var jour = dayToJour(date.getDayOfWeek());

        Prestataire p = prestataireRepo.findById(prestataireId)
                .orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));

        ServiceCatalog sc = null;
        if (serviceId != null) {
            sc = serviceRepo.findById(serviceId)
                    .orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
            boolean linked = prestataireServiceRepo.existsByPrestataireIdAndServiceId(prestataireId, serviceId);
            if (!linked) throw new UnprocessableEntityException("Ce prestataire n'offre pas ce service");
        }

        var sameDay = dispoRepo.findByPrestataireIdAndJourSemaine(prestataireId, jour);

        List<Disponibilite> applicable = new ArrayList<>();
        for (Disponibilite d : sameDay) {
            if (d.getService() == null) applicable.add(d);
            else if (sc != null && d.getService().getId().equals(sc.getId())) applicable.add(d);
        }

        int requiredDuration = determineRequestedDuration(sc, stepMinutes, dureeMinutes);
        Set<LocalTime> all = new TreeSet<>();
        for (Disponibilite d : applicable) {
            for (var t = d.getHeureDebut();
                 t.plusMinutes(stepMinutes).compareTo(d.getHeureFin()) <= 0;
                 t = t.plusMinutes(stepMinutes)) {
                LocalTime candidateEnd = t.plusMinutes(requiredDuration);
                if (candidateEnd.isBefore(t)) continue; 
                if (!candidateEnd.isAfter(d.getHeureFin())) {
                    all.add(t);
                }
            }
        }

        var rdvsBloquants = rdvRepo.findByPrestataireIdAndDateAndStatutIn(
                prestataireId, date, java.util.List.of(StatutRdv.EN_ATTENTE, StatutRdv.CONFIRME)
        );
        for (RendezVous r : rdvsBloquants) {
            LocalTime rdvStart = r.getHeure();
            LocalTime rdvEnd = rdvStart.plusMinutes(durationForRendezVous(r, stepMinutes));
            if (rdvEnd.isBefore(rdvStart)) {
                rdvEnd = LocalTime.MAX; 
            }
            LocalTime finalRdvEnd = rdvEnd;
            all.removeIf(slot -> (slot.equals(rdvStart) || slot.isAfter(rdvStart)) && slot.isBefore(finalRdvEnd));
        }

        return all.stream().map(LocalTime::toString).toList();
    }

    private JourSemaine dayToJour(java.time.DayOfWeek dow) {
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

    private int determineRequestedDuration(ServiceCatalog service, int fallback, Integer requested) {
        if (requested != null && requested > 0) {
            return requested;
        }
        Integer serviceDur = extractServiceDuration(service);
        if (serviceDur != null && serviceDur > 0) {
            return serviceDur;
        }
        return Math.max(DEFAULT_DURATION_MINUTES, Math.max(fallback, 1));
    }

    private int durationForRendezVous(RendezVous r, int fallback) {
        Integer stored = r.getDureeMinutes();
        if (stored != null && stored > 0) {
            return stored;
        }
        int duration = determineRequestedDuration(r.getService(), fallback, null);
        r.setDureeMinutes(duration);
        return duration;
    }

    private Integer extractServiceDuration(ServiceCatalog service) {
        if (service == null) return null;
        try {
            var method = service.getClass().getMethod("getDureeMin");
            Object val = method.invoke(service);
            if (val instanceof Integer di) {
                return di;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private DisponibiliteResponse toResp(Disponibilite d) {
        return new DisponibiliteResponse(
                d.getId(),
                d.getPrestataire().getId(),
                d.getJourSemaine(),
                d.getHeureDebut().toString(),
                d.getHeureFin().toString(),
                d.getService() == null ? null : d.getService().getId()
        );
    }
}
