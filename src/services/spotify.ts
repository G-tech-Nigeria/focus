// Spotify OAuth and Web Playback SDK Service

// You need to create a Spotify Developer App at https://developer.spotify.com/dashboard
// Then add your Client ID here
// Add BOTH redirect URIs to your Spotify app:
//   - http://localhost:3000/callback (for development)
//   - https://yourdomain.com/callback (for production)
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID' // Replace with your Client ID

// Automatically uses the correct origin (http for localhost, https for production)
const REDIRECT_URI = window.location.origin + '/callback'
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

// Generate random string for state parameter
const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

// Generate code verifier for PKCE
const generateCodeVerifier = (): string => {
  return generateRandomString(64)
}

// Generate code challenge from verifier
const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

// Spotify Auth URL with PKCE
export const getSpotifyAuthUrl = async (): Promise<string> => {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateRandomString(16)

  // Store verifier and state in localStorage for callback
  localStorage.setItem('spotify_code_verifier', codeVerifier)
  localStorage.setItem('spotify_auth_state', state)

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code: string): Promise<SpotifyTokenResponse | null> => {
  const codeVerifier = localStorage.getItem('spotify_code_verifier')
  
  if (!codeVerifier) {
    console.error('No code verifier found')
    return null
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await response.json()
    
    // Store tokens
    const tokenData: SpotifyTokenResponse = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + data.expires_in * 1000,
    }
    
    localStorage.setItem('spotify_token', JSON.stringify(tokenData))
    localStorage.removeItem('spotify_code_verifier')
    localStorage.removeItem('spotify_auth_state')
    
    return tokenData
  } catch (error) {
    console.error('Error exchanging code for token:', error)
    return null
  }
}

// Refresh access token
export const refreshAccessToken = async (): Promise<SpotifyTokenResponse | null> => {
  const tokenData = getStoredToken()
  
  if (!tokenData?.refresh_token) {
    return null
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()
    
    const newTokenData: SpotifyTokenResponse = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokenData.refresh_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + data.expires_in * 1000,
    }
    
    localStorage.setItem('spotify_token', JSON.stringify(newTokenData))
    
    return newTokenData
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Get stored token
export const getStoredToken = (): SpotifyTokenResponse | null => {
  const tokenStr = localStorage.getItem('spotify_token')
  if (!tokenStr) return null
  
  try {
    return JSON.parse(tokenStr)
  } catch {
    return null
  }
}

// Check if token is valid
export const isTokenValid = (): boolean => {
  const token = getStoredToken()
  if (!token) return false
  return Date.now() < token.expires_at - 60000 // 1 minute buffer
}

// Get valid access token (refresh if needed)
export const getValidAccessToken = async (): Promise<string | null> => {
  if (isTokenValid()) {
    return getStoredToken()?.access_token || null
  }
  
  const refreshed = await refreshAccessToken()
  return refreshed?.access_token || null
}

// Logout
export const spotifyLogout = (): void => {
  localStorage.removeItem('spotify_token')
  localStorage.removeItem('spotify_code_verifier')
  localStorage.removeItem('spotify_auth_state')
}

// Check if user is logged in
export const isSpotifyLoggedIn = (): boolean => {
  return getStoredToken() !== null
}

// Types
export interface SpotifyTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
}

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
  product: string // 'premium' or 'free'
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string }[]
  }
  duration_ms: number
  uri: string
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  images: { url: string }[]
  tracks: {
    total: number
    items?: { track: SpotifyTrack }[]
  }
  uri: string
}

export interface SpotifyPlaybackState {
  is_playing: boolean
  progress_ms: number
  item: SpotifyTrack | null
  device: {
    id: string
    name: string
    volume_percent: number
  }
}

// API calls
export const fetchSpotifyApi = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = await getValidAccessToken()
  
  if (!token) {
    throw new Error('No valid access token')
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return fetchSpotifyApi(endpoint, options)
      }
    }
    throw new Error(`Spotify API error: ${response.status}`)
  }

  // Some endpoints return no content
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Get current user
export const getCurrentUser = async (): Promise<SpotifyUser> => {
  return fetchSpotifyApi('/me')
}

// Get user's playlists
export const getUserPlaylists = async (limit = 20): Promise<{ items: SpotifyPlaylist[] }> => {
  return fetchSpotifyApi(`/me/playlists?limit=${limit}`)
}

// Get playlist tracks
export const getPlaylistTracks = async (playlistId: string, limit = 20): Promise<{ items: { track: SpotifyTrack }[] }> => {
  return fetchSpotifyApi(`/playlists/${playlistId}/tracks?limit=${limit}`)
}

// Get current playback state
export const getPlaybackState = async (): Promise<SpotifyPlaybackState | null> => {
  try {
    return await fetchSpotifyApi('/me/player')
  } catch {
    return null
  }
}

// Play a track or playlist
export const play = async (uri?: string, deviceId?: string): Promise<void> => {
  const body: any = {}
  if (uri) {
    if (uri.includes('playlist')) {
      body.context_uri = uri
    } else {
      body.uris = [uri]
    }
  }
  
  const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play'
  await fetchSpotifyApi(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// Pause playback
export const pause = async (): Promise<void> => {
  await fetchSpotifyApi('/me/player/pause', { method: 'PUT' })
}

// Skip to next track
export const skipToNext = async (): Promise<void> => {
  await fetchSpotifyApi('/me/player/next', { method: 'POST' })
}

// Skip to previous track
export const skipToPrevious = async (): Promise<void> => {
  await fetchSpotifyApi('/me/player/previous', { method: 'POST' })
}

// Set volume
export const setVolume = async (volumePercent: number): Promise<void> => {
  await fetchSpotifyApi(`/me/player/volume?volume_percent=${volumePercent}`, { method: 'PUT' })
}

// Transfer playback to device
export const transferPlayback = async (deviceId: string, play = false): Promise<void> => {
  await fetchSpotifyApi('/me/player', {
    method: 'PUT',
    body: JSON.stringify({
      device_ids: [deviceId],
      play,
    }),
  })
}

// Search for playlists
export const searchPlaylists = async (query: string, limit = 10): Promise<{ playlists: { items: SpotifyPlaylist[] } }> => {
  return fetchSpotifyApi(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`)
}

// Get featured playlists (lofi, focus, etc.)
export const getFeaturedPlaylists = async (): Promise<SpotifyPlaylist[]> => {
  const searches = ['lofi beats', 'focus music', 'study music', 'chill beats']
  const results: SpotifyPlaylist[] = []
  
  for (const query of searches) {
    try {
      const data = await searchPlaylists(query, 3)
      results.push(...data.playlists.items)
    } catch (e) {
      console.error('Error fetching playlists:', e)
    }
  }
  
  // Remove duplicates
  const unique = results.filter((playlist, index, self) => 
    index === self.findIndex(p => p.id === playlist.id)
  )
  
  return unique.slice(0, 12)
}
