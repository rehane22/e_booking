package com.ebooking.backend.repository;

import com.ebooking.backend.model.User;
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
       SELECT u FROM User u
       WHERE (:q IS NULL OR :q = '' OR
              LOWER(u.prenom) LIKE LOWER(CONCAT('%', :q, '%')) OR
              LOWER(u.nom)    LIKE LOWER(CONCAT('%', :q, '%')) OR
              LOWER(u.email)  LIKE LOWER(CONCAT('%', :q, '%')))
         AND (:statut IS NULL OR u.statut = :statut)
    """)
    Page<User> searchAdmin(@Param("q") String q,
                           @Param("statut") UserStatus statut,
                           Pageable pageable);
}
