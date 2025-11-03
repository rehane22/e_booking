package com.ebooking.backend.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.ebooking.backend.model.User;
import com.ebooking.backend.model.UserRole;
import com.ebooking.backend.model.enums.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.List;

@Component
public class JwtTokenService {

    private final Algorithm algorithm;
    private final String issuer;
    private final long expiresInSeconds;

    public JwtTokenService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.issuer}") String issuer,
            @Value("${jwt.expires-in-seconds}") long expiresInSeconds
    ) {
        this.algorithm = Algorithm.HMAC256(secret);
        this.issuer = issuer;
        this.expiresInSeconds = expiresInSeconds;
    }

    public String generateAccessToken(User user) {
        List<String> roles = user.getRoles().stream()
                .map(UserRole::getRole)
                .map(Role::name)
                .toList();

        Instant now = Instant.now();
        return JWT.create()
                .withIssuer(issuer)
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(expiresInSeconds)))
                .withSubject(String.valueOf(user.getId()))
                .withClaim("email", user.getEmail())
                .withArrayClaim("roles", roles.toArray(new String[0]))
                .withClaim("status", user.getStatut().name())
                .sign(algorithm);
    }

    public DecodedJWT verify(String token) {
        JWTVerifier verifier = JWT.require(algorithm).withIssuer(issuer).build();
        return verifier.verify(token);
    }

    public long getExpiresInSeconds() {
        return expiresInSeconds;
    }
}
