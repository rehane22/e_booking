package com.ebooking.backend.repository;

import com.ebooking.backend.model.User;
import com.ebooking.backend.model.UserRole;
import com.ebooking.backend.model.enums.Role;
import com.ebooking.backend.model.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByTelephone(String telephone);


    @Query("""
       SELECT DISTINCT u FROM User u
       LEFT JOIN u.roles ur
       WHERE (:q IS NULL OR :q = '' OR
              LOWER(u.prenom) LIKE LOWER(CONCAT('%', :q, '%')) OR
              LOWER(u.nom)    LIKE LOWER(CONCAT('%', :q, '%')) OR
              LOWER(u.email)  LIKE LOWER(CONCAT('%', :q, '%')))
         AND (:statut IS NULL OR u.statut = :statut)
         AND (:role IS NULL OR ur.role = :role)
         AND (:excludeRole IS NULL OR NOT EXISTS (
                SELECT 1 FROM UserRole ur2 WHERE ur2.user = u AND ur2.role = :excludeRole
             ))
    """)
    Page<User> searchAdmin(@Param("q") String q,
                           @Param("statut") UserStatus statut,
                           @Param("role") Role role,
                           @Param("excludeRole") Role excludeRole,
                           Pageable pageable);
}
