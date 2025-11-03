package com.ebooking.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "prestataire_services",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_prestataire_service", columnNames = {"prestataire_id", "service_id"})
        })
public class PrestataireService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "prestataire_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_prestataire_service_prestataire"))
    private Prestataire prestataire;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_prestataire_service_service"))
    private ServiceCatalog service;
}
