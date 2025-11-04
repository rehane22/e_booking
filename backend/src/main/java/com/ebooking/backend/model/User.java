package com.ebooking.backend.model;

import com.ebooking.backend.model.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email"),
                @Index(name = "idx_users_telephone", columnList = "telephone")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_email", columnNames = "email"),
                @UniqueConstraint(name = "uk_users_telephone", columnNames = "telephone")
        })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, nullable = false)
    private String prenom;

    @Column(length = 50, nullable = false)
    private String nom;

    @Column(length = 100, nullable = false)
    private String email; // Unicité gérée par unique constraint (attention: sensibilité à la casse côté DB)

    @Column(length = 20, nullable = false)
    private String telephone;

    @Column(name = "mot_de_passe_hash", nullable = false, columnDefinition = "text")
    private String motDePasseHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus statut = UserStatus.ACTIF;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserRole> roles = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastLoginAt;
}
