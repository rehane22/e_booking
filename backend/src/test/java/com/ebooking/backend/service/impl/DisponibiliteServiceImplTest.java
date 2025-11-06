package com.ebooking.backend.service.impl;

import com.ebooking.backend.dto.dispo.DisponibiliteResponse;
import com.ebooking.backend.exception.UnprocessableEntityException;
import com.ebooking.backend.model.*;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.StatutRdv;
import com.ebooking.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DisponibiliteServiceImplTest {

    private DisponibiliteRepository dispoRepo;
    private PrestataireRepository prestataireRepo;
    private ServiceRepository serviceRepo;
    private PrestataireServiceRepository prestataireServiceRepo;
    private RendezVousRepository rdvRepo;
    private DisponibiliteServiceImpl service;

    @BeforeEach
    void setUp() {
        dispoRepo = mock(DisponibiliteRepository.class);
        prestataireRepo = mock(PrestataireRepository.class);
        serviceRepo = mock(ServiceRepository.class);
        prestataireServiceRepo = mock(PrestataireServiceRepository.class);
        rdvRepo = mock(RendezVousRepository.class);
        service = new DisponibiliteServiceImpl(dispoRepo, prestataireRepo, serviceRepo, prestataireServiceRepo, rdvRepo);
    }

    @Test
    void slotsForDate_returnsSlotsRespectingDurationAndBookings() {
        Prestataire prestataire = new Prestataire();
        prestataire.setId(7L);
        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(prestataire));

        ServiceCatalog serviceCatalog = new ServiceCatalog();
        serviceCatalog.setId(3L);
        when(serviceRepo.findById(3L)).thenReturn(Optional.of(serviceCatalog));
        when(prestataireServiceRepo.existsByPrestataireIdAndServiceId(7L, 3L)).thenReturn(true);

        Disponibilite d = new Disponibilite();
        d.setHeureDebut(LocalTime.of(9, 0));
        d.setHeureFin(LocalTime.of(18, 0));
        d.setJourSemaine(JourSemaine.SAMEDI);
        d.setPrestataire(prestataire);
        d.setService(serviceCatalog);
        when(dispoRepo.findByPrestataireIdAndJourSemaine(7L, JourSemaine.SAMEDI)).thenReturn(List.of(d));

        LocalDate date = LocalDate.of(2025, 11, 8);
        RendezVous blocking = RendezVous.builder()
                .id(200L)
                .prestataire(prestataire)
                .service(serviceCatalog)
                .date(date)
                .heure(LocalTime.of(12, 0))
                .dureeMinutes(120)
                .statut(StatutRdv.CONFIRME)
                .build();
        when(rdvRepo.findByPrestataireIdAndDateAndStatutIn(eq(7L), eq(date), anyList()))
                .thenReturn(List.of(blocking));

        List<String> slots = service.slotsForDate(7L, 3L, date.toString(), 30, 120);

        assertThat(slots).contains("09:00", "10:30", "15:00");
        assertThat(slots).doesNotContain("12:00", "12:30", "13:00", "13:30");
    }

    @Test
    void slotsForDate_throwsWhenServiceLinkMissing() {
        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(new Prestataire()));
        when(serviceRepo.findById(3L)).thenReturn(Optional.of(new ServiceCatalog()));
        when(prestataireServiceRepo.existsByPrestataireIdAndServiceId(7L, 3L)).thenReturn(false);

        assertThatThrownBy(() -> service.slotsForDate(7L, 3L, "2025-11-08", 30, 60))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("n'offre pas ce service");
    }

    @Test
    void slotsForDate_withoutServiceUsesGeneralAvailability() {
        Prestataire prestataire = new Prestataire();
        prestataire.setId(7L);
        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(prestataire));

        Disponibilite d = new Disponibilite();
        d.setHeureDebut(LocalTime.of(9, 0));
        d.setHeureFin(LocalTime.of(12, 0));
        d.setJourSemaine(JourSemaine.SAMEDI);
        d.setPrestataire(prestataire);
        when(dispoRepo.findByPrestataireIdAndJourSemaine(7L, JourSemaine.SAMEDI)).thenReturn(List.of(d));
        when(rdvRepo.findByPrestataireIdAndDateAndStatutIn(anyLong(), any(), anyList()))
                .thenReturn(List.of());

        List<String> slots = service.slotsForDate(7L, null, "2025-11-08", 30, 60);
        assertThat(slots).contains("09:00", "10:30");
        assertThat(slots).doesNotContain("11:30"); // 11:30 + 60 > 12:00
    }

    @Test
    void createDisponibilite_rejectsOverlapWithExistingGeneral() {
        Prestataire prestataire = new Prestataire();
        prestataire.setId(7L);
        User user = new User();
        user.setId(1L);
        prestataire.setUser(user);

        when(prestataireRepo.findById(7L)).thenReturn(Optional.of(prestataire));
        when(prestataireServiceRepo.existsByPrestataireIdAndServiceId(anyLong(), anyLong())).thenReturn(true);
        when(dispoRepo.findOverlapsWithGenerals(eq(7L), eq(JourSemaine.SAMEDI), any(), any()))
                .thenReturn(List.of(new Disponibilite()));
        when(dispoRepo.findOverlapsWithAnySpecific(anyLong(), any(), any(), any()))
                .thenReturn(List.of());

        var request = new com.ebooking.backend.dto.dispo.DisponibiliteRequest(7L, JourSemaine.SAMEDI, "09:00", "11:00", null);

        assertThatThrownBy(() -> service.create(1L, request))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("Chevauchement");
    }
}
