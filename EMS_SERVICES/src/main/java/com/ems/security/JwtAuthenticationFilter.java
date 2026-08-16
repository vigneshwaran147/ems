package com.ems.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ems.constants.SecurityConstants;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, UserDetailsService userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    /**
     * Re-authenticates on ASYNC dispatches as well as the initial request.
     *
     * <p>{@code OncePerRequestFilter} skips ASYNC dispatches by default, which is
     * safe only while every endpoint is synchronous. It is not: a controller that
     * returns a {@code CompletableFuture} (see {@code ProctorViolationController})
     * releases the request thread, and Spring Security clears the
     * {@code SecurityContextHolder} as that first dispatch unwinds. When the future
     * completes, the container re-enters the filter chain on an ASYNC dispatch —
     * where Spring Security 6's {@code AuthorizationFilter} re-evaluates
     * {@code anyRequest().authenticated()} by default, but this filter, having
     * opted out, never restores the authentication it found a moment ago.</p>
     *
     * <p>The result is a request whose handler ran to completion and whose side
     * effects were committed, answered with 401 "Full authentication is required to
     * access this resource". Returning false here re-reads the same Bearer token on
     * the async dispatch and repopulates the context, so authorization sees the
     * caller it saw the first time.</p>
     */
    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader(SecurityConstants.AUTHORIZATION_HEADER);

        if (authHeader != null && authHeader.startsWith(SecurityConstants.BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = authHeader.substring(SecurityConstants.BEARER_PREFIX_LENGTH);

            try {
                if (jwtTokenProvider.validateToken(token) && jwtTokenProvider.isAccessToken(token)) {
                    String username = jwtTokenProvider.extractSubject(token);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception ex) {
                log.debug("JWT authentication skipped due to validation error: {}", ex.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
