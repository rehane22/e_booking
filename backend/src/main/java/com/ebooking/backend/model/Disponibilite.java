package com.ebooking.backend.model;

import com.ebooking.backend.model.enums.JourSemaine;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "disponibilites",
        indexes = {
                @Index(name = "idx_dispos_prestataire_jour", columnList = "prestataire_id,jour_semaine")
        })
public class Disponibilite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prestataire_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_dispos_prestataire"))
    private Prestataire prestataire;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id",
            foreignKey = @ForeignKey(name = "fk_dispos_service"))
    private ServiceCatalog service;

    @Enumerated(EnumType.STRING)
    @Column(name = "jour_semaine", nullable = false, length = 16)
    private JourSemaine jourSemaine;

    @Column(name = "heure_debut", nullable = false)
    private LocalTime heureDebut;

    @Column(name = "heure_fin", nullable = false)
    private LocalTime heureFin;
}
