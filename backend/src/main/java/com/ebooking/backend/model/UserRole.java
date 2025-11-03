package com.ebooking.backend.model;

import com.ebooking.backend.model.enums.Role;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "user_roles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_roles_user_role", columnNames = {"user_id", "role"})
        })
public class UserRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_user_roles_user"))
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Role role;

    @Getter @Setter
    @NoArgsConstructor @AllArgsConstructor @Builder
    @Entity
    @Table(name = "services",
            uniqueConstraints = {
                    @UniqueConstraint(name = "uk_services_nom", columnNames = "nom")
            })
    public static class ServiceCatalog {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(length = 100, nullable = false)
        private String nom;

        @Column(columnDefinition = "text")
        private String description;
    }
}
