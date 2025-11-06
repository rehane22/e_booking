package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.exception.UnprocessableEntityException;
import com.ebooking.backend.model.*;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.StatutRdv;
import com.ebooking.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RendezVousServiceImplTest {

    private RendezVousRepository rdvRepo;
    private ServiceRepository serviceRepo;
    private PrestataireRepository prestataireRepo;
    private PrestataireServiceRepository prestataireServiceRepo;
    private DisponibiliteRepository dispoRepo;
    private UserRepository userRepo;
    private RendezVousServiceImpl service;

    @BeforeEach
    void setUp() {
        rdvRepo = mock(RendezVousRepository.class);
        serviceRepo = mock(ServiceRepository.class);
        prestataireRepo = mock(PrestataireRepository.class);
        prestataireServiceRepo = mock(PrestataireServiceRepository.class);
        dispoRepo = mock(DisponibiliteRepository.class);
        userRepo = mock(UserRepository.class);
        service = new RendezVousServiceImpl(rdvRepo, serviceRepo, prestataireRepo, prestataireServiceRepo, dispoRepo, userRepo);
    }

    @Test
    void create_ok_whenSlotCoveredAndFree() {
        User client = new User();
        client.setId(1L);
        ServiceCatalog sc = new ServiceCatalog();
        sc.setId(3L);
        Prestataire prestataire = new Prestataire();
        prestataire.setId(7L);

        when(userRepo.findById(1L)).thenReturn(Optional.of(client));
        when(serviceRepo.findById(3L)).thenReturn(Optional.of(sc));
        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(prestataire));
        when(prestataireServiceRepo.existsByPrestataireIdAndServiceId(7L, 3L)).thenReturn(true);

        LocalDate date = LocalDate.of(2025, 11, 8);
        LocalTime heure = LocalTime.of(13, 30);
        when(dispoRepo.findCoveringSlot(eq(7L), eq(JourSemaine.SAMEDI), eq(3L), eq(heure)))
                .thenReturn(List.of(disponibilite(LocalTime.of(9, 0), LocalTime.of(18, 0))));
        when(rdvRepo.findByPrestataireIdAndDateAndStatutIn(eq(7L), eq(date), anyList())).thenReturn(List.of());
        when(rdvRepo.save(any(RendezVous.class))).thenAnswer(invocation -> {
            RendezVous saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        RendezVousRequest req = new RendezVousRequest(3L, 7L, date.toString(), "13:30", 120);
        var resp = service.create(1L, req);

        assertThat(resp.id()).isEqualTo(99L);
        assertThat(resp.date()).isEqualTo("2025-11-08");
        assertThat(resp.heure()).isEqualTo("13:30");
        assertThat(resp.dureeMin()).isEqualTo(120);

        ArgumentCaptor<RendezVous> captor = ArgumentCaptor.forClass(RendezVous.class);
        verify(rdvRepo).save(captor.capture());
        RendezVous saved = captor.getValue();
        assertThat(saved.getPrestataire().getId()).isEqualTo(7L);
        assertThat(saved.getDureeMinutes()).isEqualTo(120);
        assertThat(saved.getStatut()).isEqualTo(StatutRdv.EN_ATTENTE);
    }

    @Test
    void create_throwsWhenNoCoveringSlot() {
        User client = new User();
        client.setId(1L);
        ServiceCatalog sc = new ServiceCatalog();
        sc.setId(3L);
        Prestataire prestataire = new Prestataire();
        prestataire.setId(7L);

        when(userRepo.findById(1L)).thenReturn(Optional.of(client));
        when(serviceRepo.findById(3L)).thenReturn(Optional.of(sc));
        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(prestataire));
        when(prestataireServiceRepo.existsByPrestataireIdAndServiceId(7L, 3L)).thenReturn(true);
        when(dispoRepo.findCoveringSlot(eq(7L), any(), any(), any())).thenReturn(List.of());

        RendezVousRequest req = new RendezVousRequest(3L, 7L, "2025-11-08", "13:30", 120);

        assertThatThrownBy(() -> service.create(1L, req))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("Pas de créneau disponible");

        verify(rdvRepo, never()).save(any());
    }

    @Test
    void create_throwsWhenOverlapDetected() {
        User client = new User();
        client.setId(1L);
        ServiceCatalog sc = new ServiceCatalog();
        sc.setId(3L);
        Prestataire prestataire = new Prestataire();
        prestataire.setId(7L);

        when(userRepo.findById(1L)).thenReturn(Optional.of(client));
        when(serviceRepo.findById(3L)).thenReturn(Optional.of(sc));
        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(prestataire));
        when(prestataireServiceRepo.existsByPrestataireIdAndServiceId(7L, 3L)).thenReturn(true);
        LocalDate date = LocalDate.of(2025, 11, 8);
        LocalTime heure = LocalTime.of(13, 30);
        when(dispoRepo.findCoveringSlot(eq(7L), eq(JourSemaine.SAMEDI), eq(3L), eq(heure)))
                .thenReturn(List.of(disponibilite(LocalTime.of(9, 0), LocalTime.of(18, 0))));
        RendezVous existing = RendezVous.builder()
                .id(200L)
                .prestataire(prestataire)
                .service(sc)
                .date(date)
                .heure(LocalTime.of(13, 0))
                .dureeMinutes(120)
                .statut(StatutRdv.CONFIRME)
                .build();
        when(rdvRepo.findByPrestataireIdAndDateAndStatutIn(7L, date, List.of(StatutRdv.EN_ATTENTE, StatutRdv.CONFIRME)))
                .thenReturn(List.of(existing));

        RendezVousRequest req = new RendezVousRequest(3L, 7L, date.toString(), "13:30", 120);

        assertThatThrownBy(() -> service.create(1L, req))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("Créneau déjà réservé");
    }

    private Disponibilite disponibilite(LocalTime debut, LocalTime fin) {
        Disponibilite d = new Disponibilite();
        d.setHeureDebut(debut);
        d.setHeureFin(fin);
        return d;
    }
}
