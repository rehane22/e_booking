package com.ebooking.backend.controller;

import com.ebooking.backend.dto.auth.UserResponse;
import com.ebooking.backend.security.CurrentUser;
import com.ebooking.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("")
public class MeController {

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        Long uid = CurrentUser.id();
        return ResponseEntity.ok(authService.me(uid));
    }
}
