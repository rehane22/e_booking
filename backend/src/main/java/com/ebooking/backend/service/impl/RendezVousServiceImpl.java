package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.dto.rdv.RendezVousResponse;
import com.ebooking.backend.dto.rdv.RendezVousUpdateRequest;
import com.ebooking.backend.exception.UnprocessableEntityException;
import com.ebooking.backend.model.*;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.StatutRdv;
import com.ebooking.backend.repository.*;
import com.ebooking.backend.security.CurrentUser;
import com.ebooking.backend.service.RendezVousService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class RendezVousServiceImpl implements RendezVousService {
    private final RendezVousRepository rdvRepo;
    private final ServiceRepository serviceRepo;
    private final PrestataireRepository prestataireRepo;
    private final PrestataireServiceRepository prestataireServiceRepo;
    private final DisponibiliteRepository dispoRepo;
    private final UserRepository userRepo;
    private static final List<StatutRdv> BLOCKING_STATUSES = List.of(StatutRdv.EN_ATTENTE, StatutRdv.CONFIRME);
    private static final int DEFAULT_DURATION_MINUTES = 60;

    @Override
    public RendezVousResponse create(Long currentUserId, RendezVousRequest req) {
        User client = userRepo.findById(currentUserId).orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable"));
        ServiceCatalog sc = serviceRepo.findById(req.serviceId()).orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
        Prestataire p = prestataireRepo.findById(req.prestataireId()).orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        boolean linked = prestataireServiceRepo.existsByPrestataireIdAndServiceId(p.getId(), sc.getId());
        if (!linked) throw new UnprocessableEntityException("Ce prestataire n'offre pas ce service");
        LocalDate date = LocalDate.parse(req.date());
        LocalTime heure = LocalTime.parse(req.heure());
        JourSemaine jour = dayToJour(date.getDayOfWeek());
        int duree = resolveDuration(req.dureeMin(), sc);
        final LocalTime fin = safeAddMinutes(heure, duree);
        var covering = dispoRepo.findCoveringSlot(p.getId(), jour, sc.getId(), heure);
        if (covering.stream().noneMatch(d -> !fin.isAfter(d.getHeureFin())))
            throw new UnprocessableEntityException("Pas de créneau disponible couvrant cet horaire");
        if (hasOverlap(p.getId(), date, heure, duree, null)) {
            throw new UnprocessableEntityException("Créneau déjà réservé");
        }
        RendezVous rdv = RendezVous.builder()
                .service(sc)
                .prestataire(p)
                .client(client)
                .date(date)
                .heure(heure)
                .dureeMinutes(duree)
                .statut(StatutRdv.EN_ATTENTE)
                .build();
        rdv = rdvRepo.save(rdv);
        return toResp(rdv);
    }

    @Transactional(readOnly = true)
    @Override
    public List<RendezVousResponse> listByClient(Long currentUserId, Long clientId) {
        if (!Objects.equals(currentUserId, clientId) && !CurrentUser.hasRole("ADMIN")) {
            throw new AccessDeniedException("Accès refusé");
        }
        return rdvRepo.findByClientIdOrderByDateAscHeureAsc(clientId).stream().map(this::toResp).toList();
    }

    @Transactional(readOnly = true)
    @Override
    public List<RendezVousResponse> listByPrestataire(Long currentUserId, Long prestataireId) {
        Prestataire p = prestataireRepo.findById(prestataireId).orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        if (!Objects.equals(p.getUser().getId(), currentUserId) && !CurrentUser.hasRole("ADMIN")) {
            throw new AccessDeniedException("Accès refusé");
        }
        return rdvRepo.findByPrestataireIdOrderByDateAscHeureAsc(prestataireId).stream().map(this::toResp).toList();
    }

    @Transactional(readOnly = true)
    @Override
    public List<RendezVousResponse> listByPrestataireAndDate(Long currentUserId, Long prestataireId, String dateStr) {
        Prestataire p = prestataireRepo.findById(prestataireId).orElseThrow(() -> new EntityNotFoundException("Prestataire introuvable"));
        if (!Objects.equals(p.getUser().getId(), currentUserId) && !CurrentUser.hasRole("ADMIN")) {
            throw new AccessDeniedException("Accès refusé");
        }
        var date = LocalDate.parse(dateStr);
        return rdvRepo.findByPrestataireIdAndDateOrderByHeureAsc(prestataireId, date).stream().map(this::toResp).toList();
    }

    @Override
    public RendezVousResponse confirmer(Long currentUserId, Long rdvId) {
        RendezVous rdv = rdvRepo.findById(rdvId).orElseThrow(() -> new EntityNotFoundException("RDV introuvable"));
        Prestataire p = rdv.getPrestataire();
        if (!Objects.equals(p.getUser().getId(), currentUserId) && !CurrentUser.hasRole("ADMIN")) {
            throw new AccessDeniedException("Seul le prestataire ou un admin peut confirmer");
        }
        if (rdv.getStatut() != StatutRdv.EN_ATTENTE) {
            throw new UnprocessableEntityException("Transition invalide : doit être EN_ATTENTE");
        }
        rdv.setStatut(StatutRdv.CONFIRME);
        return toResp(rdv);
    }

    @Override
    public RendezVousResponse annuler(Long currentUserId, Long rdvId) {
        RendezVous rdv = rdvRepo.findById(rdvId).orElseThrow(() -> new EntityNotFoundException("RDV introuvable"));
        boolean isClient = Objects.equals(rdv.getClient().getId(), currentUserId);
        boolean isPrestataire = Objects.equals(rdv.getPrestataire().getUser().getId(), currentUserId);
        boolean isAdmin = CurrentUser.hasRole("ADMIN");
        if (!isClient && !isPrestataire && !isAdmin) {
            throw new AccessDeniedException("Seul le client, le prestataire ou un admin peut annuler");
        }
        if (rdv.getStatut() == StatutRdv.ANNULE)
            return toResp(rdv); // idempotent
        rdv.setStatut(StatutRdv.ANNULE);
        return toResp(rdv);
    }

    @Override
    public RendezVousResponse refuser(Long currentUserId, Long rdvId) {
        RendezVous rdv = rdvRepo.findById(rdvId).orElseThrow(() -> new EntityNotFoundException("RDV introuvable"));
        boolean isPrestataire = Objects.equals(rdv.getPrestataire().getUser().getId(), currentUserId);
        boolean isAdmin = CurrentUser.hasRole("ADMIN");
        if (!isPrestataire && !isAdmin) {
            throw new AccessDeniedException("Seul le prestataire ou un admin peut refuser");
        }
        if (rdv.getStatut() == StatutRdv.REFUSE || rdv.getStatut() == StatutRdv.ANNULE) return toResp(rdv);
        rdv.setStatut(StatutRdv.REFUSE);
        return toResp(rdv);
    }

    @Override
    public RendezVousResponse update(Long currentUserId, Long rdvId, RendezVousUpdateRequest req) {
        RendezVous rdv = rdvRepo.findById(rdvId).orElseThrow(() -> new EntityNotFoundException("RDV introuvable"));
        boolean isPrestataire = Objects.equals(rdv.getPrestataire().getUser().getId(), currentUserId);
        boolean isAdmin = CurrentUser.hasRole("ADMIN");
        if (!isPrestataire && !isAdmin)
            throw new AccessDeniedException("Seul le prestataire ou un admin peut modifier"); // déduire nouvelles valeur
        ServiceCatalog service = rdv.getService();
        if (req.serviceId() != null) {
            service = serviceRepo.findById(req.serviceId()).orElseThrow(() -> new EntityNotFoundException("Service introuvable"));
            boolean linked = prestataireServiceRepo.existsByPrestataireIdAndServiceId(rdv.getPrestataire().getId(), service.getId());
            if (!linked) throw new UnprocessableEntityException("Ce prestataire n'offre pas ce service");
        }
        LocalDate date = rdv.getDate();
        if (req.date() != null) date = LocalDate.parse(req.date());
        LocalTime heure = rdv.getHeure();
        if (req.heure() != null) heure = LocalTime.parse(req.heure());
        JourSemaine jour = dayToJour(date.getDayOfWeek());
        var covering = dispoRepo.findCoveringSlot(rdv.getPrestataire().getId(), jour, service.getId(), heure);
        Integer storedDuration = rdv.getDureeMinutes();
        int duree = (storedDuration != null && storedDuration > 0)
                ? storedDuration
                : resolveDuration(null, service);
        final LocalTime fin = safeAddMinutes(heure, duree);
        if (covering.stream().noneMatch(d -> !fin.isAfter(d.getHeureFin())))
            throw new UnprocessableEntityException("Pas de créneau disponible couvrant cet horaire");
        if (hasOverlap(rdv.getPrestataire().getId(), date, heure, duree, rdv.getId())) {
            throw new UnprocessableEntityException("Créneau déjà réservé");
        }
        rdv.setService(service);
        rdv.setDate(date);
        rdv.setHeure(heure); // Optionnel: repasser en EN_ATTENTE si déjà confirmé
        if (rdv.getDureeMinutes() == null || rdv.getDureeMinutes() <= 0) {
            rdv.setDureeMinutes(duree);
        }
        if (rdv.getStatut() == StatutRdv.CONFIRME) {
            rdv.setStatut(StatutRdv.EN_ATTENTE);
        }
        return toResp(rdv);
    } /* ------------ helpers ------------ */

    private JourSemaine dayToJour(DayOfWeek dow) {
        return switch (dow) {
            case MONDAY -> com.ebooking.backend.model.enums.JourSemaine.LUNDI;
            case TUESDAY -> com.ebooking.backend.model.enums.JourSemaine.MARDI;
            case WEDNESDAY -> com.ebooking.backend.model.enums.JourSemaine.MERCREDI;
            case THURSDAY -> com.ebooking.backend.model.enums.JourSemaine.JEUDI;
            case FRIDAY -> com.ebooking.backend.model.enums.JourSemaine.VENDREDI;
            case SATURDAY -> com.ebooking.backend.model.enums.JourSemaine.SAMEDI;
            case SUNDAY -> com.ebooking.backend.model.enums.JourSemaine.DIMANCHE;
        };
    }

    private int resolveDuration(Integer requested, ServiceCatalog service) {
        if (requested != null) {
            if (requested <= 0) {
                throw new UnprocessableEntityException("La durée doit être strictement positive");
            }
            return requested;
        }
        Integer serviceDuration = extractServiceDuration(service);
        if (serviceDuration != null && serviceDuration > 0) {
            return serviceDuration;
        }
        return DEFAULT_DURATION_MINUTES;
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

    private LocalTime safeAddMinutes(LocalTime start, int minutes) {
        if (minutes <= 0) {
            throw new UnprocessableEntityException("La durée doit être strictement positive");
        }
        LocalTime end = start.plusMinutes(minutes);
        if (end.isBefore(start)) {
            throw new UnprocessableEntityException("La durée ne peut pas dépasser minuit");
        }
        return end;
    }

    private boolean hasOverlap(Long prestataireId, LocalDate date, LocalTime start, int dureeMinutes, Long ignoreRdvId) {
        LocalTime end = safeAddMinutes(start, dureeMinutes);
        var existing = rdvRepo.findByPrestataireIdAndDateAndStatutIn(prestataireId, date, BLOCKING_STATUSES);
        for (RendezVous other : existing) {
            if (ignoreRdvId != null && Objects.equals(other.getId(), ignoreRdvId)) continue;
            int otherDuration = blockingDurationOf(other);
            LocalTime otherEnd = other.getHeure().plusMinutes(otherDuration);
            if (otherEnd.isBefore(other.getHeure())) {
                otherEnd = LocalTime.MAX;
            }
            if (!(end.compareTo(other.getHeure()) <= 0 || start.compareTo(otherEnd) >= 0)) {
                return true;
            }
        }
        return false;
    }

    private int blockingDurationOf(RendezVous rdv) {
        Integer stored = rdv.getDureeMinutes();
        if (stored != null && stored > 0) {
            return stored;
        }
        Integer serviceDuration = extractServiceDuration(rdv.getService());
        int duration = (serviceDuration != null && serviceDuration > 0) ? serviceDuration : DEFAULT_DURATION_MINUTES;
        rdv.setDureeMinutes(duration);
        return duration;
    }

    private RendezVousResponse toResp(RendezVous r) {
        Integer duree = Optional.ofNullable(r.getDureeMinutes())
                .orElseGet(() -> extractServiceDuration(r.getService()));
        return new RendezVousResponse(r.getId(), r.getService().getId(), r.getPrestataire().getId(), r.getClient().getId(), r.getDate().toString(), r.getHeure().toString(), r.getStatut().name(), duree);
    }
}
