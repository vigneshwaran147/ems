package com.ems.constants;

public final class SecurityConstants {

    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";
    public static final int BEARER_PREFIX_LENGTH = 7;
    public static final String ROLE_PREFIX = "ROLE_";
    public static final String JWT_CLAIM_TOKEN_TYPE = "token_type";
    public static final String JWT_CLAIM_ROLES = "roles";
    public static final String JWT_CLAIM_JTI = "jti";
    public static final String TOKEN_TYPE_ACCESS = "ACCESS";
    public static final String TOKEN_TYPE_REFRESH = "REFRESH";

    private SecurityConstants() {
    }
}
