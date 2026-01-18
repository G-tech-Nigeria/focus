import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCodeForToken } from '../services/spotify'

export default function SpotifyCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const storedState = localStorage.getItem('spotify_auth_state')
      const errorParam = urlParams.get('error')

      if (errorParam) {
        setError(`Spotify authorization failed: ${errorParam}`)
        setTimeout(() => navigate('/'), 3000)
        return
      }

      if (!code) {
        setError('No authorization code received')
        setTimeout(() => navigate('/'), 3000)
        return
      }

      if (state !== storedState) {
        setError('State mismatch - possible CSRF attack')
        setTimeout(() => navigate('/'), 3000)
        return
      }

      try {
        const token = await exchangeCodeForToken(code)
        if (token) {
          // Success - redirect to main app
          navigate('/')
        } else {
          setError('Failed to exchange code for token')
          setTimeout(() => navigate('/'), 3000)
        }
      } catch (err) {
        setError('Error during authentication')
        setTimeout(() => navigate('/'), 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-xl mb-4">{error}</div>
            <div className="text-white/50">Redirecting back...</div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-white text-xl">Connecting to Spotify...</div>
          </>
        )}
      </div>
    </div>
  )
}
