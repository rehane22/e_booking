package com.ebooking.backend.security;

import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                DecodedJWT jwt = jwtTokenService.verify(token);
                Long userId = Long.valueOf(jwt.getSubject());

                var authorities = Arrays.stream(jwt.getClaim("roles").asArray(String.class))
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                        .collect(Collectors.toList());

                Authentication auth = new AbstractAuthenticationToken(authorities) {
                    @Override public Object getCredentials() { return token; }
                    @Override public Object getPrincipal() { return userId; }
                };
                ((AbstractAuthenticationToken) auth).setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                ((AbstractAuthenticationToken) auth).setAuthenticated(true);

                // Place dans le SecurityContext
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ex) {
                // token invalide/expiré → pas d’auth ; on laisse tomber sur 401 plus tard si endpoint protégé
            }
        }

        chain.doFilter(request, response);
    }
}
