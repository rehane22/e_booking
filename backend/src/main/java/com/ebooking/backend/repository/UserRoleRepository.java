package com.ebooking.backend.repository;

import com.ebooking.backend.model.UserRole;
import com.ebooking.backend.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findByUserId(Long userId);

    boolean existsByUserIdAndRole(Long userId, Role role);
}
