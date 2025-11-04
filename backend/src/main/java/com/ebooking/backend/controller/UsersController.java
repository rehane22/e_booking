package com.ebooking.backend.controller;

import com.ebooking.backend.dto.auth.UpdateUserRequest;
import com.ebooking.backend.dto.auth.UserResponse;
import com.ebooking.backend.security.CurrentUser;
import com.ebooking.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UsersController {

    private final UserService userService;

    /** GET /users/{id} -> ADMIN ou le propriétaire */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id) {
        Long requesterId = CurrentUser.id();
        return ResponseEntity.ok(userService.getById(requesterId, id));
    }

    /** PUT /users/{id} -> ADMIN ou le propriétaire */
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req) {
        Long requesterId = CurrentUser.id();
        return ResponseEntity.ok(userService.updateById(requesterId, id, req));
    }

    /** DELETE /users/{id} -> ADMIN ou le propriétaire */
    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long requesterId = CurrentUser.id();
        userService.deleteById(requesterId, id);
        return ResponseEntity.noContent().build();
    }
}
