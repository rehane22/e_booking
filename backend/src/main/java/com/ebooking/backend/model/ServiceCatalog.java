package com.ebooking.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "services",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_services_nom", columnNames = "nom")
        })
public class ServiceCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100, nullable = false)
    private String nom;

    @Column(columnDefinition = "text")
    private String description;
}
