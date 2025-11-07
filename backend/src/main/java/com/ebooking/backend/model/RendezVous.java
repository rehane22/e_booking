package com.ebooking.backend.model;

import com.ebooking.backend.model.enums.StatutRdv;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "rendez_vous", indexes = {@Index(name = "idx_rdv_prestataire_date", columnList = "prestataire_id,date_rdv"), @Index(name = "idx_rdv_client_date", columnList = "client_id,date_rdv")})
public class RendezVous {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; 
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false, foreignKey = @ForeignKey(name = "fk_rdv_service"))
    private ServiceCatalog service;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prestataire_id", nullable = false, foreignKey = @ForeignKey(name = "fk_rdv_prestataire"))
    private Prestataire prestataire;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false, foreignKey = @ForeignKey(name = "fk_rdv_client"))
    private User client;
    @Column(name = "date_rdv", nullable = false)
    private LocalDate date;
    @Column(name = "heure_rdv", nullable = false)
    private LocalTime heure;
    @Column(name = "duree_minutes")
    private Integer dureeMinutes;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private StatutRdv statut = StatutRdv.EN_ATTENTE;
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
