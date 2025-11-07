package com.ebooking.backend.service;

import com.ebooking.backend.dto.admin.*;
import org.springframework.data.domain.Page;

public interface AdminUserService {
    Page<AdminUserItemResponse> list(String query, String status, String role, String excludeRole, int page, int size, String sort);
    AdminUserDetailResponse get(Long id);
    void activate(Long id);
    void block(Long id);
}
