import { Injectable } from '@nestjs/common'

type OidcClient = typeof import('openid-client')

interface DiscoveredConfig {
  config: Awaited<ReturnType<OidcClient['discovery']>>
  client: OidcClient
}

@Injectable()
export class OidcService {
  private discoveryPromise: Promise<DiscoveredConfig> | null = null

  isEnabled(): boolean {
    return !!process.env.OIDC_CLIENT_ID
  }

  private getDiscoveredConfig(): Promise<DiscoveredConfig> {
    if (this.discoveryPromise) return this.discoveryPromise

    this.discoveryPromise = (async () => {
      const oidcClient = await (Function(
        'return import("openid-client")'
      )() as Promise<OidcClient>)

      const issuerUrl = process.env.OIDC_ISSUER_URL
      const clientId = process.env.OIDC_CLIENT_ID
      const clientSecret = process.env.OIDC_CLIENT_SECRET

      if (!issuerUrl || !clientId) {
        throw new Error('OIDC_ISSUER_URL and OIDC_CLIENT_ID must be set')
      }

      const config = await oidcClient.discovery(
        new URL(issuerUrl),
        clientId,
        clientSecret
      )

      return { config, client: oidcClient }
    })()

    this.discoveryPromise.catch(() => {
      this.discoveryPromise = null
    })

    return this.discoveryPromise
  }

  async getAuthorizationUrl(): Promise<{
    url: string
    state: string
    codeVerifier: string
  }> {
    const { config, client } = await this.getDiscoveredConfig()

    const codeVerifier = client.randomPKCECodeVerifier()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
    const state = client.randomState()

    const redirectUri = process.env.OIDC_REDIRECT_URI
    if (!redirectUri) throw new Error('OIDC_REDIRECT_URI must be set')

    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    })

    return { url: url.href, state, codeVerifier }
  }

  async handleCallback(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<{ preferredUsername: string }> {
    const { config, client } = await this.getDiscoveredConfig()

    const redirectUri = process.env.OIDC_REDIRECT_URI
    if (!redirectUri) throw new Error('OIDC_REDIRECT_URI must be set')

    const callbackUrl = new URL(redirectUri)
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('state', state)

    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
    })

    const claims = tokens.claims()
    if (!claims) {
      throw new Error('No ID token claims returned from OIDC provider')
    }

    const preferredUsername =
      (claims['preferred_username'] as string | undefined) ??
      (claims['sub'] as string)

    return { preferredUsername }
  }
}
