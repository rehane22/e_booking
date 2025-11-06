package com.ebooking.backend.service;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.dto.rdv.RendezVousResponse;
import com.ebooking.backend.exception.UnprocessableEntityException;
import com.ebooking.backend.model.*;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.StatutRdv;
import com.ebooking.backend.repository.*;
import com.ebooking.backend.service.impl.RendezVousServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RendezVousServiceImplTest {

    @Mock
    private RendezVousRepository rdvRepository;
    @Mock
    private ServiceRepository serviceRepository;
    @Mock
    private PrestataireRepository prestataireRepository;
    @Mock
    private PrestataireServiceRepository prestataireServiceRepository;
    @Mock
    private DisponibiliteRepository disponibiliteRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RendezVousServiceImpl service;

    private static final Long CLIENT_ID = 1L;
    private static final Long SERVICE_ID = 2L;
    private static final Long PRESTATAIRE_ID = 3L;
    private static final LocalDate DATE = LocalDate.of(2025, 1, 13); // Lundi
    private static final LocalTime HEURE = LocalTime.of(10, 0);

    private User client;
    private ServiceCatalog serviceCatalog;
    private Prestataire prestataire;

    @BeforeEach
    void setUp() {
        client = new User();
        client.setId(CLIENT_ID);

        serviceCatalog = ServiceCatalog.builder()
                .id(SERVICE_ID)
                .nom("Diagnostic")
                .build();

        prestataire = Prestataire.builder()
                .id(PRESTATAIRE_ID)
                .user(User.builder().id(99L).build())
                .build();

        when(userRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(serviceRepository.findById(SERVICE_ID)).thenReturn(Optional.of(serviceCatalog));
        when(prestataireRepository.findById(PRESTATAIRE_ID)).thenReturn(Optional.of(prestataire));
        when(prestataireServiceRepository.existsByPrestataireIdAndServiceId(PRESTATAIRE_ID, SERVICE_ID)).thenReturn(true);

        Disponibilite slot = Disponibilite.builder()
                .prestataire(prestataire)
                .jourSemaine(JourSemaine.LUNDI)
                .heureDebut(LocalTime.of(8, 0))
                .heureFin(LocalTime.of(12, 0))
                .build();
        when(disponibiliteRepository.findCoveringSlot(
                eq(PRESTATAIRE_ID),
                eq(JourSemaine.LUNDI),
                eq(SERVICE_ID),
                eq(HEURE)
        )).thenReturn(List.of(slot));

        when(rdvRepository.findByPrestataireIdAndDateAndStatutIn(
                eq(PRESTATAIRE_ID),
                eq(DATE),
                anyList()
        )).thenReturn(Collections.emptyList());

        when(rdvRepository.save(any(RendezVous.class))).thenAnswer(invocation -> {
            RendezVous rdv = invocation.getArgument(0);
            rdv.setId(42L);
            return rdv;
        });
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("create() persiste un rendez-vous quand le créneau est disponible")
    void createShouldPersistRendezVousWhenSlotAvailable() {
        RendezVousRequest request = new RendezVousRequest(
                SERVICE_ID,
                PRESTATAIRE_ID,
                DATE.toString(),
                HEURE.toString(),
                null
        );

        RendezVousResponse response = service.create(CLIENT_ID, request);

        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.serviceId()).isEqualTo(SERVICE_ID);
        assertThat(response.prestataireId()).isEqualTo(PRESTATAIRE_ID);
        assertThat(response.clientId()).isEqualTo(CLIENT_ID);
        assertThat(response.statut()).isEqualTo(StatutRdv.EN_ATTENTE.name());

        ArgumentCaptor<RendezVous> captor = ArgumentCaptor.forClass(RendezVous.class);
        verify(rdvRepository).save(captor.capture());
        RendezVous saved = captor.getValue();
        assertThat(saved.getDate()).isEqualTo(DATE);
        assertThat(saved.getHeure()).isEqualTo(HEURE);
        assertThat(saved.getStatut()).isEqualTo(StatutRdv.EN_ATTENTE);
    }

    @Test
    @DisplayName("create() rejette la réservation lorsqu'aucune disponibilité ne couvre l'horaire demandé")
    void createShouldFailWhenSlotDoesNotCoverRequestedEndTime() {
        Disponibilite slot = Disponibilite.builder()
                .prestataire(prestataire)
                .jourSemaine(JourSemaine.LUNDI)
                .heureDebut(LocalTime.of(8, 0))
                .heureFin(LocalTime.of(10, 30))
                .build();
        when(disponibiliteRepository.findCoveringSlot(
                PRESTATAIRE_ID,
                JourSemaine.LUNDI,
                SERVICE_ID,
                HEURE
        )).thenReturn(List.of(slot));

        RendezVousRequest request = new RendezVousRequest(
                SERVICE_ID,
                PRESTATAIRE_ID,
                DATE.toString(),
                HEURE.toString(),
                null
        );

        assertThatThrownBy(() -> service.create(CLIENT_ID, request))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("créneau disponible");

        verify(rdvRepository, never()).save(any());
    }

    @Test
    @DisplayName("create() rejette la réservation lorsqu'un rendez-vous bloquant existe déjà")
    void createShouldFailWhenOverlapExists() {
        RendezVous existing = RendezVous.builder()
                .id(100L)
                .service(serviceCatalog)
                .prestataire(prestataire)
                .client(client)
                .date(DATE)
                .heure(LocalTime.of(10, 30))
                .dureeMinutes(60)
                .statut(StatutRdv.CONFIRME)
                .build();

        when(rdvRepository.findByPrestataireIdAndDateAndStatutIn(
                PRESTATAIRE_ID,
                DATE,
                anyList()
        )).thenReturn(List.of(existing));

        RendezVousRequest request = new RendezVousRequest(
                SERVICE_ID,
                PRESTATAIRE_ID,
                DATE.toString(),
                HEURE.toString(),
                null
        );

        assertThatThrownBy(() -> service.create(CLIENT_ID, request))
                .isInstanceOf(UnprocessableEntityException.class)
                .hasMessageContaining("Créneau déjà réservé");

        verify(rdvRepository, never()).save(any());
    }

    @Nested
    class ListByClientTests {

        @Test
        @DisplayName("listByClient() autorise un client à consulter ses rendez-vous")
        void listByClientShouldReturnWhenCallerIsClient() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(CLIENT_ID, null, List.of())
            );

            RendezVous rdv = RendezVous.builder()
                    .id(7L)
                    .service(serviceCatalog)
                    .prestataire(prestataire)
                    .client(client)
                    .date(DATE)
                    .heure(HEURE)
                    .statut(StatutRdv.CONFIRME)
                    .build();

            when(rdvRepository.findByClientIdOrderByDateAscHeureAsc(CLIENT_ID))
                    .thenReturn(List.of(rdv));

            List<RendezVousResponse> responses = service.listByClient(CLIENT_ID, CLIENT_ID);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).id()).isEqualTo(7L);
        }

        @Test
        @DisplayName("listByClient() autorise un administrateur à consulter les rendez-vous d'un autre client")
        void listByClientShouldAllowAdmin() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            999L,
                            null,
                            List.of(() -> "ROLE_ADMIN")
                    )
            );

            RendezVous rdv = RendezVous.builder()
                    .id(11L)
                    .service(serviceCatalog)
                    .prestataire(prestataire)
                    .client(client)
                    .date(DATE)
                    .heure(HEURE)
                    .statut(StatutRdv.CONFIRME)
                    .build();
            when(rdvRepository.findByClientIdOrderByDateAscHeureAsc(CLIENT_ID))
                    .thenReturn(List.of(rdv));

            List<RendezVousResponse> responses = service.listByClient(999L, CLIENT_ID);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).id()).isEqualTo(11L);
        }

        @Test
        @DisplayName("listByClient() refuse l'accès à un utilisateur non admin pour un autre client")
        void listByClientShouldRejectUnauthorizedUser() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(
                            999L,
                            null,
                            List.of(() -> "ROLE_USER")
                    )
            );

            assertThatThrownBy(() -> service.listByClient(999L, CLIENT_ID))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

            verify(rdvRepository, never()).findByClientIdOrderByDateAscHeureAsc(anyLong());
        }
    }
}
