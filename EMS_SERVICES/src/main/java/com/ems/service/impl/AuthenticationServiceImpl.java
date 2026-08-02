package com.ems.service.impl;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.dto.request.ChangePasswordRequest;
import com.ems.dto.request.ForgotPasswordRequest;
import com.ems.dto.request.LoginRequest;
import com.ems.dto.request.LogoutRequest;
import com.ems.dto.request.RefreshTokenRequest;
import com.ems.dto.request.RegisterRequest;
import com.ems.dto.request.ResetPasswordRequest;
import com.ems.dto.response.AuthResponse;
import com.ems.dto.response.ForgotPasswordResponse;
import com.ems.dto.response.MessageResponse;
import com.ems.dto.response.UserSummaryResponse;
import com.ems.entity.PasswordResetToken;
import com.ems.entity.RefreshToken;
import com.ems.entity.Role;
import com.ems.entity.User;
import com.ems.enums.RoleName;
import com.ems.exception.BusinessException;
import com.ems.exception.ResourceNotFoundException;
import com.ems.exception.UnauthorizedException;
import com.ems.repository.PasswordResetTokenRepository;
import com.ems.repository.RefreshTokenRepository;
import com.ems.repository.RoleRepository;
import com.ems.repository.UserRepository;
import com.ems.security.JwtProperties;
import com.ems.security.JwtTokenProvider;
import com.ems.security.PasswordPolicyValidator;
import com.ems.service.AuthenticationService;
import com.ems.service.ProfilePhotoStorageService;
import com.ems.util.TokenHashUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.data.mode", havingValue = "sql", matchIfMissing = true)
@Transactional
public class AuthenticationServiceImpl implements AuthenticationService {

	private static final String GENERIC_FORGOT_PASSWORD_MESSAGE =
			"If the email exists, password reset instructions have been initiated.";

	private final UserRepository userRepository;
	private final RoleRepository roleRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordResetTokenRepository passwordResetTokenRepository;
	private final AuthenticationManager authenticationManager;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;
	private final PasswordPolicyValidator passwordPolicyValidator;
	private final ProfilePhotoStorageService profilePhotoStorageService;

	@Override
	public AuthResponse register(RegisterRequest request) {
		validateRegistrationRequest(request);
		passwordPolicyValidator.validateOrThrow(request.password());

		Role userRole = roleRepository.findByName(RoleName.USER)
				.orElseThrow(() -> new ResourceNotFoundException("Default USER role is missing"));

		String profilePhotoKey = profilePhotoStorageService.storeProfilePhoto(
				request.profilePhoto(),
				request.userId());

		User user = User.builder()
				.userId(request.userId().trim())
				.firstName(request.firstName().trim())
				.lastName(request.lastName().trim())
				.email(request.email().trim().toLowerCase())
				.mobileNumber(request.mobileNumber().trim())
				.passwordHash(passwordEncoder.encode(request.password()))
				.profilePhotoKey(profilePhotoKey)
				.address(request.address())
				.yearsOfExperience(request.yearsOfExperience())
				.currentSkillLevel(request.currentSkillLevel())
				.currentOrganization(request.currentOrganization())
				.qualification(request.qualification())
				.fatherName(request.fatherName())
				.enabled(true)
				.accountNonLocked(true)
				.roles(Set.of(userRole))
				.build();

		User savedUser = userRepository.save(user);
		log.info("User registered successfully: userId={}, email={}",
				savedUser.getUserId(), savedUser.getEmail());

		return issueTokens(savedUser);
	}

	@Override
	public AuthResponse login(LoginRequest request) {
		String email = request.email().trim().toLowerCase();

		try {
			authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
		} catch (BadCredentialsException ex) {
			log.warn("Login failed due to bad credentials for email={}", email);
			throw new UnauthorizedException("Invalid email or password");
		}

		User user = userRepository.findByEmailIgnoreCase(email)
				.orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

		if (!user.isEnabled() || !user.isAccountNonLocked()) {
			throw new UnauthorizedException("Account is disabled or locked");
		}

		refreshTokenRepository.revokeAllActiveByUserId(user.getId());
		log.info("Login success for userId={}, email={}", user.getUserId(), user.getEmail());
		return issueTokens(user);
	}

	@Override
	public AuthResponse refreshToken(RefreshTokenRequest request) {
		String refreshToken = request.refreshToken();

		if (!jwtTokenProvider.validateToken(refreshToken) || !jwtTokenProvider.isRefreshToken(refreshToken)) {
			throw new UnauthorizedException("Invalid refresh token");
		}

		String tokenHash = TokenHashUtil.sha256Hex(refreshToken);
		RefreshToken persistedToken = refreshTokenRepository.findByTokenHashAndRevokedFalse(tokenHash)
				.orElseThrow(() -> new UnauthorizedException("Refresh token has been revoked"));

		if (persistedToken.getExpiresAt().isBefore(Instant.now())) {
			refreshTokenRepository.revokeByTokenHash(tokenHash);
			throw new UnauthorizedException("Refresh token expired");
		}

		User user = persistedToken.getUser();
		int updated = refreshTokenRepository.revokeByTokenHash(tokenHash);
		if (updated == 0) {
			throw new UnauthorizedException("Refresh token has been revoked");
		}

		return issueTokens(user);
	}

	@Override
	public MessageResponse logout(LogoutRequest request) {
		String tokenHash = TokenHashUtil.sha256Hex(request.refreshToken());
		int updated = refreshTokenRepository.revokeByTokenHash(tokenHash);
		if (updated > 0) {
			log.info("Refresh token revoked successfully during logout");
		}
		return new MessageResponse("Logged out successfully");
	}

	@Override
	public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
		userRepository.findByEmailIgnoreCase(request.email().trim().toLowerCase())
				.ifPresent(user -> {
					String rawToken = UUID.randomUUID() + "." + UUID.randomUUID();
					Instant expiresAt = Instant.now().plusSeconds(30L * 60L);

					PasswordResetToken token = PasswordResetToken.builder()
							.user(user)
							.tokenHash(TokenHashUtil.sha256Hex(rawToken))
							.expiresAt(expiresAt)
							.used(false)
							.build();

					passwordResetTokenRepository.save(token);
					log.info("Password reset token generated for userId={} and queued for out-of-band delivery",
							user.getUserId());
				});

		return new ForgotPasswordResponse(GENERIC_FORGOT_PASSWORD_MESSAGE);
	}

	@Override
	public MessageResponse resetPassword(ResetPasswordRequest request) {
		passwordPolicyValidator.validateOrThrow(request.newPassword());

		String tokenHash = TokenHashUtil.sha256Hex(request.token());
		PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashAndUsedFalse(tokenHash)
				.orElseThrow(() -> new UnauthorizedException("Invalid password reset token"));

		if (resetToken.getExpiresAt().isBefore(Instant.now())) {
			throw new UnauthorizedException("Password reset token expired");
		}

		User user = resetToken.getUser();
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepository.save(user);

		resetToken.setUsed(true);
		passwordResetTokenRepository.save(resetToken);

		refreshTokenRepository.revokeAllActiveByUserId(user.getId());
		log.info("Password reset completed for userId={}", user.getUserId());
		return new MessageResponse("Password reset successful");
	}

	@Override
	public MessageResponse changePassword(String currentUserEmail, ChangePasswordRequest request) {
		User user = userRepository.findByEmailIgnoreCase(currentUserEmail)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			throw new UnauthorizedException("Current password is incorrect");
		}

		passwordPolicyValidator.validateOrThrow(request.newPassword());
		if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
			throw new BusinessException("New password must be different from the current password");
		}

		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepository.save(user);
		refreshTokenRepository.revokeAllActiveByUserId(user.getId());
		log.info("Password changed successfully for userId={}", user.getUserId());

		return new MessageResponse("Password changed successfully");
	}

	@Override
	@Transactional(readOnly = true)
	public UserSummaryResponse getCurrentUser(String email) {
		User user = userRepository.findByEmailIgnoreCase(email)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
		return toUserSummary(user);
	}

	private void validateRegistrationRequest(RegisterRequest request) {
		String email = request.email().trim().toLowerCase();
		String mobile = request.mobileNumber().trim();
		String userId = request.userId().trim();

		if (userRepository.existsByEmailIgnoreCase(email)) {
			throw new BusinessException("Email already registered");
		}
		if (userRepository.existsByMobileNumber(mobile)) {
			throw new BusinessException("Mobile number already registered");
		}
		if (userRepository.existsByUserId(userId)) {
			throw new BusinessException("User ID already exists");
		}
	}

	private AuthResponse issueTokens(User user) {
		Set<String> roles = user.getRoles().stream()
				.map(role -> role.getName().name())
				.collect(Collectors.toSet());

		String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), roles);
		String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

		RefreshToken persisted = RefreshToken.builder()
				.user(user)
				.tokenHash(TokenHashUtil.sha256Hex(refreshToken))
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(jwtProperties.getRefreshTokenExpirationMinutes() * 60))
				.revoked(false)
				.build();
		refreshTokenRepository.save(persisted);

		return new AuthResponse(
				accessToken,
				refreshToken,
				"Bearer",
				jwtProperties.getAccessTokenExpirationMinutes(),
				toUserSummary(user));
	}

	private UserSummaryResponse toUserSummary(User user) {
		Set<String> roles = user.getRoles().stream()
				.map(role -> role.getName().name())
				.collect(Collectors.toSet());

		return new UserSummaryResponse(
				user.getUserId(),
				user.getFirstName(),
				user.getLastName(),
				user.getEmail(),
				roles);
	}
}
