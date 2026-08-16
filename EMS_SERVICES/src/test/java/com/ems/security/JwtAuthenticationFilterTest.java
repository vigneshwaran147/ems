package com.ems.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import com.ems.constants.SecurityConstants;

import jakarta.servlet.DispatcherType;

/**
 * Covers the dispatch types {@link JwtAuthenticationFilter} has to authenticate,
 * not just the happy path on the initial request.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JwtAuthenticationFilterTest {

	private static final String USERNAME = "candidate@example.com";
	private static final String TOKEN = "a.valid.jwt";

	@Mock
	private JwtTokenProvider jwtTokenProvider;

	@Mock
	private UserDetailsService userDetailsService;

	private JwtAuthenticationFilter filter;

	@BeforeEach
	void setUp() {
		filter = new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);

		UserDetails userDetails = new User(USERNAME, "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
		when(jwtTokenProvider.validateToken(TOKEN)).thenReturn(true);
		when(jwtTokenProvider.isAccessToken(TOKEN)).thenReturn(true);
		when(jwtTokenProvider.extractSubject(TOKEN)).thenReturn(USERNAME);
		when(userDetailsService.loadUserByUsername(USERNAME)).thenReturn(userDetails);

		SecurityContextHolder.clearContext();
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	private MockHttpServletRequest bearerRequest(DispatcherType dispatcherType) {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/proctor/log-violation");
		request.addHeader(SecurityConstants.AUTHORIZATION_HEADER, SecurityConstants.BEARER_PREFIX + TOKEN);
		request.setDispatcherType(dispatcherType);
		return request;
	}

	@Test
	void authenticatesOnTheInitialRequestDispatch() throws Exception {
		filter.doFilter(bearerRequest(DispatcherType.REQUEST), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
		assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(USERNAME);
	}

	/**
	 * The regression this filter was changed for.
	 *
	 * <p>A controller returning a {@code CompletableFuture} frees the request
	 * thread, and Spring Security clears the context as that dispatch unwinds. The
	 * container then re-enters the chain on an ASYNC dispatch, where
	 * {@code AuthorizationFilter} re-checks {@code anyRequest().authenticated()}.
	 * While this filter inherited {@code OncePerRequestFilter}'s default of
	 * skipping ASYNC, nothing restored the authentication, and every call to
	 * {@code POST /api/proctor/log-violation} answered 401 — after its handler had
	 * already run and written the violation.</p>
	 */
	@Test
	void authenticatesOnAsyncDispatchSoCompletableFutureEndpointsAreNotRejected() throws Exception {
		// The context is empty at this point exactly as it is mid-async-dispatch.
		filter.doFilter(bearerRequest(DispatcherType.ASYNC), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication())
				.as("async dispatch must re-authenticate, or authorization sees an anonymous caller and returns 401")
				.isNotNull();
		assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(USERNAME);
	}

	@Test
	void leavesContextEmptyWhenTokenIsRejected() throws Exception {
		when(jwtTokenProvider.validateToken(TOKEN)).thenReturn(false);

		filter.doFilter(bearerRequest(DispatcherType.ASYNC), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
	}
}
