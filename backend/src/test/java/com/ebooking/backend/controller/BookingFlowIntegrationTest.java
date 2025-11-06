package com.ebooking.backend.controller;

import com.ebooking.backend.dto.rdv.RendezVousRequest;
import com.ebooking.backend.model.*;
import com.ebooking.backend.model.enums.JourSemaine;
import com.ebooking.backend.model.enums.StatutRdv;
import com.ebooking.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase(replace = org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class BookingFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Autowired private UserRepository userRepository;
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private PrestataireRepository prestataireRepository;
    @Autowired private PrestataireServiceRepository prestataireServiceRepository;
    @Autowired private DisponibiliteRepository disponibiliteRepository;
    @Autowired private RendezVousRepository rendezVousRepository;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void clientCanBookSlotAndItIsStored() throws Exception {
        var prestataireUser = userRepository.save(buildUser());
        var prestataire = prestataireRepository.save(buildPrestataire(prestataireUser));
        var service = serviceRepository.save(buildService());
        prestataireServiceRepository.save(buildPrestataireService(prestataire, service));
        disponibiliteRepository.save(buildDisponibilite(prestataire, service, JourSemaine.LUNDI, LocalTime.of(9,0), LocalTime.of(18,0)));

        var client = userRepository.save(buildUser());
        authenticate(client.getId(), List.of("ROLE_CLIENT"));

        LocalDate bookingDate = next(DayOfWeek.MONDAY);
        RendezVousRequest request = new RendezVousRequest(
                service.getId(),
                prestataire.getId(),
                bookingDate.toString(),
                "10:00",
                60
        );

        mockMvc.perform(post("/rendezvous")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heure").value("10:00"))
                .andExpect(jsonPath("$.statut").value(StatutRdv.EN_ATTENTE.name()));

        assertThat(rendezVousRepository.count()).isEqualTo(1);
        var rdv = rendezVousRepository.findAll().get(0);
        assertThat(rdv.getDureeMinutes()).isEqualTo(60);
        assertThat(rdv.getClient().getId()).isEqualTo(client.getId());
    }

    @Test
    void slotsEndpointReturnsAvailableStarts() throws Exception {
        var prestataireUser = userRepository.save(buildUser());
        var prestataire = prestataireRepository.save(buildPrestataire(prestataireUser));
        var service = serviceRepository.save(buildService());
        prestataireServiceRepository.save(buildPrestataireService(prestataire, service));
        disponibiliteRepository.save(buildDisponibilite(prestataire, service, JourSemaine.SAMEDI, LocalTime.of(9,0), LocalTime.of(18,0)));

        var client = userRepository.save(buildUser());
        authenticate(client.getId(), List.of("ROLE_CLIENT"));

        LocalDate saturday = next(DayOfWeek.SATURDAY);

        mockMvc.perform(get("/disponibilites/" + prestataire.getId() + "/slots")
                        .param("date", saturday.toString())
                        .param("serviceId", service.getId().toString())
                        .param("dureeMin", "60"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").exists());
    }

    private void authenticate(Long userId, List<String> roles) {
        var authorities = roles.stream().map(SimpleGrantedAuthority::new).toList();
        var auth = new UsernamePasswordAuthenticationToken(userId, "", authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User buildUser() {
        User u = new User();
        u.setPrenom("John");
        u.setNom("Doe");
        u.setEmail(UUID.randomUUID() + "@test.com");
        u.setTelephone(UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        u.setMotDePasseHash("hash");
        return u;
    }

    private ServiceCatalog buildService() {
        ServiceCatalog sc = new ServiceCatalog();
        sc.setNom("Massage" + UUID.randomUUID());
        sc.setDescription("Détente");
        return sc;
    }

    private Prestataire buildPrestataire(User owner) {
        Prestataire p = new Prestataire();
        p.setUser(owner);
        p.setSpecialite("Bien-être");
        return p;
    }

    private PrestataireService buildPrestataireService(Prestataire p, ServiceCatalog s) {
        PrestataireService ps = new PrestataireService();
        ps.setPrestataire(p);
        ps.setService(s);
        return ps;
    }

    private Disponibilite buildDisponibilite(Prestataire p, ServiceCatalog s, JourSemaine jour, LocalTime debut, LocalTime fin) {
        Disponibilite d = new Disponibilite();
        d.setPrestataire(p);
        d.setService(s);
        d.setJourSemaine(jour);
        d.setHeureDebut(debut);
        d.setHeureFin(fin);
        return d;
    }

    private LocalDate next(DayOfWeek target) {
        LocalDate now = LocalDate.now();
        int diff = (target.getValue() - now.getDayOfWeek().getValue() + 7) % 7;
        if (diff == 0) diff = 7;
        return now.plusDays(diff);
    }
}
