/**
 * Spotify Integration Service (OAuth PKCE & Web API Helper)
 * Handles Spotify authentication, token storage, user profile retrieval, and API requests.
 */

const STORAGE_CLIENT_ID = 'deskforge_spotify_client_id';
const STORAGE_ACCESS_TOKEN = 'deskforge_spotify_access_token';
const STORAGE_REFRESH_TOKEN = 'deskforge_spotify_refresh_token';
const STORAGE_EXPIRES_AT = 'deskforge_spotify_expires_at';
const STORAGE_PROFILE = 'deskforge_spotify_user_profile';
const STORAGE_VERIFIER = 'deskforge_spotify_pkce_verifier';

export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:8888/callback';

export class SpotifyService {
  constructor() {
    this.clientId = localStorage.getItem(STORAGE_CLIENT_ID) || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
    this.accessToken = localStorage.getItem(STORAGE_ACCESS_TOKEN) || null;
    this.refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN) || null;
    this.expiresAt = parseInt(localStorage.getItem(STORAGE_EXPIRES_AT) || '0', 10);
    this.userProfile = null;

    try {
      const rawProfile = localStorage.getItem(STORAGE_PROFILE);
      if (rawProfile) this.userProfile = JSON.parse(rawProfile);
    } catch (e) {
      this.userProfile = null;
    }
  }

  setClientId(id) {
    this.clientId = id.trim();
    localStorage.setItem(STORAGE_CLIENT_ID, this.clientId);
  }

  getClientId() {
    return this.clientId;
  }

  isAuthenticated() {
    return !!(this.accessToken && Date.now() < this.expiresAt);
  }

  getUserProfile() {
    return this.userProfile;
  }

  /**
   * Helper to generate cryptographically random string for PKCE code verifier
   */
  generateRandomString(length = 64) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    return Array.from(values).reduce((acc, x) => acc + possible[x % possible.length], '');
  }

  /**
   * Helper to hash PKCE code verifier using SHA-256
   */
  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Builds Spotify OAuth PKCE authorization URL
   */
  async buildAuthUrl(redirectUri = DEFAULT_REDIRECT_URI) {
    if (!this.clientId) {
      throw new Error('Client ID de Spotify no configurado. Por favor ingresa tu Client ID.');
    }

    const verifier = this.generateRandomString(64);
    localStorage.setItem(STORAGE_VERIFIER, verifier);

    const challenge = await this.generateCodeChallenge(verifier);
    const scopes = [
      'user-read-private',
      'user-read-email',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'playlist-read-private',
      'playlist-read-collaborative'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: scopes
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for Spotify Access Token & Refresh Token using PKCE
   */
  async exchangeCodeForToken(code, redirectUri = DEFAULT_REDIRECT_URI) {
    const verifier = localStorage.getItem(STORAGE_VERIFIER);
    if (!verifier) {
      throw new Error('Code verifier no encontrado en almacenamiento local.');
    }

    const bodyParams = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error_description || 'Error al obtener tokens de Spotify.');
    }

    const data = await response.json();
    this.storeTokens(data);
    await this.fetchUserProfile();
    return this.userProfile;
  }

  /**
   * Store access tokens in memory and localStorage
   */
  storeTokens(data) {
    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
      localStorage.setItem(STORAGE_REFRESH_TOKEN, this.refreshToken);
    }

    // expires_in is in seconds
    this.expiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 60000; // 1 min buffer

    localStorage.setItem(STORAGE_ACCESS_TOKEN, this.accessToken);
    localStorage.setItem(STORAGE_EXPIRES_AT, this.expiresAt.toString());
  }

  /**
   * Refresh expired access token using stored refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken || !this.clientId) {
      throw new Error('No hay Refresh Token o Client ID disponible para renovar la sesión.');
    }

    const bodyParams = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });

    if (!response.ok) {
      this.logout();
      throw new Error('No se pudo renovar la sesión de Spotify. Inicia sesión nuevamente.');
    }

    const data = await response.json();
    this.storeTokens(data);
    return this.accessToken;
  }

  /**
   * Fetch current authenticated user's profile info from Spotify API
   */
  async fetchUserProfile() {
    if (!this.accessToken) return null;

    if (Date.now() >= this.expiresAt && this.refreshToken) {
      await this.refreshAccessToken();
    }

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 && this.refreshToken) {
        await this.refreshAccessToken();
        return this.fetchUserProfile();
      }
      throw new Error('No se pudo cargar la información del usuario de Spotify.');
    }

    const data = await response.json();
    this.userProfile = {
      id: data.id,
      displayName: data.display_name || data.id,
      email: data.email || '',
      country: data.country || '',
      product: data.product || 'free', // 'premium' or 'free'
      imageUrl: data.images && data.images.length > 0 ? data.images[0].url : null
    };

    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(this.userProfile));
    return this.userProfile;
  }

  /**
   * Logout and clear all stored Spotify credentials
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.userProfile = null;

    localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_EXPIRES_AT);
    localStorage.removeItem(STORAGE_PROFILE);
    localStorage.removeItem(STORAGE_VERIFIER);
  }
}
