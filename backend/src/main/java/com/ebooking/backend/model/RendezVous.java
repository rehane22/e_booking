package com.ebooking.backend.model;

import com.ebooking.backend.model.enums.StatutRdv;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "rendez_vous",
        indexes = {
                @Index(name = "idx_rdv_prestataire_date", columnList = "prestataire_id,date_rdv"),
                @Index(name = "idx_rdv_client_date", columnList = "client_id,date_rdv")
        })
public class RendezVous {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Service réservé
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_rdv_service"))
    private ServiceCatalog service;

    // Prestataire choisi
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prestataire_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_rdv_prestataire"))
    private Prestataire prestataire;

    // Client (User)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_rdv_client"))
    private User client;

    @Column(name = "date_rdv", nullable = false)
    private LocalDate date;

    @Column(name = "heure_rdv", nullable = false)
    private LocalTime heure;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private StatutRdv statut = StatutRdv.EN_ATTENTE;
}
