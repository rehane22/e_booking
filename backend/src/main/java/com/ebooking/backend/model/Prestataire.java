package com.ebooking.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "prestataires",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_prestataires_user", columnNames = "user_id")
        })
public class Prestataire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_prestataires_user"))
    private User user;

    @Column(length = 100)
    private String specialite;

    @Column(columnDefinition = "text")
    private String adresse;
}
