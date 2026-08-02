package com.ems.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import com.ems.constants.SecurityConstants;
import com.ems.enums.TokenType;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;
    private final SecretKey signingKey;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = Keys.hmacShaKeyFor(decodeSecret(jwtProperties.getSecret()));
    }

    public String generateAccessToken(String subject, Collection<String> roles) {
        return buildToken(
                subject,
                Map.of(
                        SecurityConstants.JWT_CLAIM_TOKEN_TYPE, TokenType.ACCESS.name(),
                        SecurityConstants.JWT_CLAIM_ROLES, roles),
                jwtProperties.getAccessTokenExpirationMinutes());
    }

    public String generateRefreshToken(String subject) {
        return buildToken(
                subject,
            Map.of(
                SecurityConstants.JWT_CLAIM_TOKEN_TYPE, TokenType.REFRESH.name(),
                SecurityConstants.JWT_CLAIM_JTI, UUID.randomUUID().toString()),
                jwtProperties.getRefreshTokenExpirationMinutes());
    }

    public String extractSubject(String token) {
        return parseClaims(token).getSubject();
    }

    public List<String> extractRoles(String token) {
        Object roleClaim = parseClaims(token).get(SecurityConstants.JWT_CLAIM_ROLES);
        if (roleClaim instanceof Collection<?> roles) {
            return roles.stream().map(String::valueOf).toList();
        }
        return Collections.emptyList();
    }

    public TokenType extractTokenType(String token) {
        String value = parseClaims(token).get(SecurityConstants.JWT_CLAIM_TOKEN_TYPE, String.class);
        return TokenType.valueOf(value);
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public boolean isAccessToken(String token) {
        try {
            return TokenType.ACCESS == extractTokenType(token);
        } catch (Exception ex) {
            return false;
        }
    }

    public boolean isRefreshToken(String token) {
        try {
            return TokenType.REFRESH == extractTokenType(token);
        } catch (Exception ex) {
            return false;
        }
    }

    public Instant getAccessTokenExpiresAt() {
        return Instant.now().plusSeconds(jwtProperties.getAccessTokenExpirationMinutes() * 60);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String buildToken(String subject, Map<String, Object> claims, long expirationMinutes) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMinutes * 60_000);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuer(jwtProperties.getIssuer())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    private byte[] decodeSecret(String secret) {
        try {
            return Decoders.BASE64.decode(secret);
        } catch (RuntimeException ex) {
            return secret.getBytes(StandardCharsets.UTF_8);
        }
    }
}
