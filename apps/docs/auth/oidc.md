# OpenID Connect (OIDC)

Comic Shelf supports OIDC for Single Sign-On (SSO).

## Configuration

Set the following environment variables to enable OIDC:

```env
OIDC_ISSUER=https://your-idp.example.com
OIDC_CLIENT_ID=comic-shelf
OIDC_CLIENT_SECRET=your-secret
OIDC_REDIRECT_URI=http://localhost:3000/api/auth/oidc/callback
```

## Flow

1. User clicks "Login with SSO"
2. Redirected to the IdP's authorization endpoint
3. After consent, redirected back to `/api/auth/oidc/callback`
4. JWT cookie is set and user is logged in

## Supported Providers

Any OIDC-compliant provider works, including:
- Keycloak
- Auth0
- Authentik
- GitHub (via OIDC)
