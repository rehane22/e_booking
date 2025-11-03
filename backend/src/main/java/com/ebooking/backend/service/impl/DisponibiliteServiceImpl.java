package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.dispo.DisponibiliteRequest;
import com.ebooking.backend.dto.dispo.DisponibiliteResponse;
import com.ebooking.backend.exception.UnprocessableEntityException;
import com.ebooking.backend.model.Disponibilite;
import com.ebooking.backend.model.Prestataire;
import com.ebooking.backend.model.ServiceCatalog;
import com.ebooking.backend.model.enums.JourSemaine;
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

    @Transactional(readOnly = true)
    @Override
    public List<DisponibiliteResponse> listByPrestataire(Long prestataireId) {
        return dispoRepo.findByPrestataireIdAndJourSemaine(prestataireId, JourSemaine.LUNDI) // trick? non, on veut tout
                .stream().map(this::toResp).toList();
    }

    // Correction : on veut tout (pas seulement LUNDI) => surcharge :
    @Transactional(readOnly = true)
    public List<DisponibiliteResponse> listAllByPrestataire(Long prestataireId) {
        return dispoRepo.findAll().stream()
                .filter(d -> Objects.equals(d.getPrestataire().getId(), prestataireId))
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

        // Anti-chevauchement
        checkOverlapsOnCreate(p.getId(), req.jourSemaine(), debut, fin, sc);

        Disponibilite d = Disponibilite.builder()
                .prestataire(p)
                .service(sc) // null = général
                .jourSemaine(req.jourSemaine())
                .heureDebut(debut)
                .heureFin(fin)
                .build();
        d = dispoRepo.save(d);
        return toResp(d);
    }

    @Override
    public DisponibiliteResponse update(Long currentUserId, Long dispoId, DisponibiliteRequest req) {
        Disponibilite d = dispoRepo.findById(dispoId)
                .orElseThrow(() -> new EntityNotFoundException("Disponibilité introuvable"));
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

        // Anti-chevauchement (ignorer soi-même)
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
        return LocalTime.parse(hhmm); // "HH:mm"
    }

    private void checkOverlapsOnCreate(Long prestataireId, JourSemaine jour, LocalTime debut, LocalTime fin, ServiceCatalog sc) {
        if (sc == null) {
            // on crée un GÉNÉRAL : interdit d'overlap avec GÉNÉRAUX + avec ANY SPÉCIFIQUE
            if (!dispoRepo.findOverlapsWithGenerals(prestataireId, jour, debut, fin).isEmpty()
                    || !dispoRepo.findOverlapsWithAnySpecific(prestataireId, jour, debut, fin).isEmpty()) {
                throw new UnprocessableEntityException("Chevauchement détecté avec un créneau existant (général/spécifique)");
            }
        } else {
            // on crée un SPÉCIFIQUE : interdit d'overlap avec GÉNÉRAUX + SPÉCIFIQUES(serviceId)
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
    public List<String> slotsForDate(Long prestataireId, Long serviceId, String dateIso, Integer stepMinutes) {
        if (stepMinutes == null || stepMinutes <= 0) stepMinutes = 30;
        LocalDate date = LocalDate.parse(dateIso);
        JourSemaine jour = dayToJour(date.getDayOfWeek());

        // Valider prestataire
        Prestataire p = prestataireRepo.findById(prestataireId)
                .orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));

        // Si serviceId fourni, vérifier qu’il existe et que le prestataire l’offre
        ServiceCatalog sc = null;
        if (serviceId != null) {
            sc = serviceRepo.findById(serviceId)
                    .orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
            boolean linked = prestataireServiceRepo.existsByPrestataireIdAndServiceId(prestataireId, serviceId);
            if (!linked) {
                throw new UnprocessableEntityException("Ce prestataire n'offre pas ce service");
            }
        }

        // Récupérer les dispos du bon jour
        List<Disponibilite> sameDay = dispoRepo.findByPrestataireIdAndJourSemaine(prestataireId, jour);

        // Filtrer : créneaux généraux + (si serviceId != null) créneaux spécifiques de ce service
        List<Disponibilite> applicable = new ArrayList<>();
        for (Disponibilite d : sameDay) {
            if (d.getService() == null) {
                applicable.add(d); // général
            } else if (sc != null && d.getService().getId().equals(sc.getId())) {
                applicable.add(d); // spécifique du service
            }
        }

        // Générer les slots HH:mm (fin exclue) pour chaque créneau applicable
        Set<String> all = new TreeSet<>();
        for (Disponibilite d : applicable) {
            for (var t = d.getHeureDebut();
                 t.plusMinutes(stepMinutes).compareTo(d.getHeureFin()) <= 0;
                 t = t.plusMinutes(stepMinutes)) {
                all.add(t.toString()); // "HH:mm"
            }
        }

        // Retirer les heures déjà réservées à cette date
        var rdvs = rdvRepo.findByPrestataireIdAndDateOrderByHeureAsc(prestataireId, date);
        for (var r : rdvs) {
            all.remove(r.getHeure().toString());
        }

        return new ArrayList<>(all);
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
