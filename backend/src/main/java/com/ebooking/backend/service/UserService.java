package com.ebooking.backend.service;

import com.ebooking.backend.dto.auth.UpdateUserRequest;
import com.ebooking.backend.dto.auth.UserResponse;

public interface UserService {
    UserResponse getById(Long requesterId, Long id);
    UserResponse updateById(Long requesterId, Long id, UpdateUserRequest req);
    void deleteById(Long requesterId, Long id);
}
