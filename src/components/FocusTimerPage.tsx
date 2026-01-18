
import { useState, useEffect, useRef, useMemo } from 'react'

// Declare global types
declare global {
  interface Window {
    AnimatedBackground: any
  }
}
import { 
  Play, 
  Pause, 
  Settings, 
  Volume2, 
  BarChart3,
  Target,
  Coffee,
  Moon,
  Maximize2,
  Minimize2,
  Keyboard,
  Palette,
  Clock,
  Monitor,
  Info,
  Bell,
  RefreshCw,
  Cloud,
} from 'lucide-react'

interface FocusTimerPageProps {}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

interface Session {
  id: string
  mode: TimerMode
  duration: number
  completedAt: Date
  focusTitle?: string
  timestamp: string
}


interface Theme {
  id: string
  name: string
  gradient: string
  primaryColor: string
  description: string
  category: 'liveBackground' | 'colors' | 'ambient'
  emoji: string
  backgroundImage?: string
  type?: 'static' | 'animated'
  animationType?: 'rain' | 'snow' | 'thunderstorm' | 'galaxy' | 'aurora' | 'ocean' | 'forest' | 'particles' | 'geometric' | 'fire' | 'smoke' | 'matrix' | 'neon' | 'underwater' | 'glitch' | 'sunset' | 'cyberpunk' | 'sparkles' | 'lava'
  videoBackground?: string
}

export default function FocusTimerPage({}: FocusTimerPageProps) {
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(25 * 60) // in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<TimerMode>('focus')
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [focusTitle, setFocusTitle] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedSound, setSelectedSound] = useState('rain')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [weatherEffect, setWeatherEffect] = useState<'none' | 'rain' | 'snow'>('none')
  const [currentTheme, setCurrentTheme] = useState('purple')
  const [selectedTimerDesign, setSelectedTimerDesign] = useState('default')
  const [projectorMode, setProjectorMode] = useState(false)
  
  // Ambient Sounds State
  const [selectedAmbientSound, setSelectedAmbientSound] = useState<string | null>(null)
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false)
  const [soundVolumes, setSoundVolumes] = useState<Record<string, number>>({})
  const [soundCategory, setSoundCategory] = useState('all')
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null)
  const [gainNode, setGainNode] = useState<GainNode | null>(null)
  const [isLoadingSound, setIsLoadingSound] = useState<string | null>(null)

  // Get volume for a specific sound (default to 50 if not set)
  const getSoundVolume = (soundId: string) => soundVolumes[soundId] ?? 50

  // Initialize Web Audio API
  const initAudioContext = () => {
    if (!audioContext || audioContext.state === 'closed') {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioContext(ctx)
      return ctx
    }
    return audioContext
  }

  // Load audio file and create buffer
  const loadAudioBuffer = async (soundId: string): Promise<AudioBuffer | null> => {
    const sound = ambientSounds.find(s => s.id === soundId)
    if (!sound) return null

    try {
      const response = await fetch(`/sounds/${sound.file}`)
      const arrayBuffer = await response.arrayBuffer()
      const ctx = initAudioContext()
      const buffer = await ctx.decodeAudioData(arrayBuffer)
      return buffer
    } catch (error) {
      console.error('Error loading audio buffer:', error)
      return null
    }
  }

  // Analyze audio buffer to find optimal loop points
  const analyzeAudioBuffer = (buffer: AudioBuffer) => {
    const channelData = buffer.getChannelData(0) // Use first channel
    const sampleRate = buffer.sampleRate
    const length = channelData.length
    
    // Find the actual start of audio (skip silence)
    let startIndex = 0
    const silenceThreshold = 0.001
    for (let i = 0; i < length; i++) {
      if (Math.abs(channelData[i]) > silenceThreshold) {
        startIndex = i
        break
      }
    }
    
    // Find the actual end of audio (skip silence)
    let endIndex = length - 1
    for (let i = length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > silenceThreshold) {
        endIndex = i
        break
      }
    }
    
    // Find the best loop point by analyzing waveform similarity
    const searchWindow = Math.min(4410, Math.floor(sampleRate * 0.1)) // 100ms search window
    let bestLoopPoint = endIndex
    let bestMatch = Infinity
    
    // Look for a point near the end that matches the beginning
    for (let i = Math.max(startIndex, endIndex - searchWindow); i < endIndex; i++) {
      let match = 0
      const compareLength = Math.min(1000, endIndex - i) // Compare up to 1000 samples
      
      for (let j = 0; j < compareLength; j++) {
        const diff = Math.abs(channelData[startIndex + j] - channelData[i + j])
        match += diff
      }
      
      if (match < bestMatch) {
        bestMatch = match
        bestLoopPoint = i
      }
    }
    
    // Calculate loop points in seconds
    const loopStart = startIndex / sampleRate
    const loopEnd = bestLoopPoint / sampleRate
    
    console.log(`Audio analysis: Start=${loopStart.toFixed(3)}s, End=${loopEnd.toFixed(3)}s, Duration=${(loopEnd - loopStart).toFixed(3)}s, Match Quality=${(1/bestMatch).toFixed(6)}`)
    
    return { loopStart, loopEnd, startIndex, endIndex: bestLoopPoint }
  }

  // Create seamless loop with crossfade using Web Audio API
  const createSeamlessLoop = async (buffer: AudioBuffer, volume: number) => {
    const ctx = initAudioContext()
    
    // Resume AudioContext if suspended (required for user interaction)
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    
    // Analyze the audio to find optimal loop points
    const { loopStart, loopEnd, startIndex, endIndex } = analyzeAudioBuffer(buffer)
    
    // Create gain node for volume control
    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)
    
    // Create source node with precise loop points
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.loopStart = loopStart
    source.loopEnd = loopEnd
    source.connect(gain)
    
    // Create crossfade for smoother transitions
    const crossfadeDuration = 0.1 // 100ms crossfade
    const crossfadeSamples = Math.floor(crossfadeDuration * buffer.sampleRate)
    
    // Apply crossfade to the buffer
    const channelData = buffer.getChannelData(0)
    const crossfadeStart = Math.max(0, endIndex - crossfadeSamples)
    const length = channelData.length
    
    // Create crossfade envelope
    for (let i = 0; i < crossfadeSamples; i++) {
      const fadeIn = i / crossfadeSamples
      const fadeOut = 1 - fadeIn
      
      // Apply fade out to the end
      if (crossfadeStart + i < length) {
        channelData[crossfadeStart + i] *= fadeOut
      }
      
      // Apply fade in to the beginning
      if (startIndex + i < length) {
        channelData[startIndex + i] *= fadeIn
      }
    }
    
    console.log(`Seamless loop created: ${loopStart.toFixed(3)}s to ${loopEnd.toFixed(3)}s with ${crossfadeDuration}s crossfade`)
    
    return { source, gain }
  }

  // Update volume for a specific sound
  const updateSoundVolume = (soundId: string, volume: number) => {
    setSoundVolumes(prev => ({ ...prev, [soundId]: volume }))
    // Update gain node volume if this sound is playing
    if (selectedAmbientSound === soundId && gainNode) {
      gainNode.gain.value = volume / 100
    }
  }

  // Play ambient sound with seamless looping
  const playAmbientSound = async (soundId: string) => {
    console.log('Playing ambient sound:', soundId)
    
    // Show loading state
    setIsLoadingSound(soundId)
    
    try {
      // Stop current audio if playing
      stopAmbientSound()
      
      // Load audio buffer
      console.log('Loading audio buffer...')
      const buffer = await loadAudioBuffer(soundId)
      if (!buffer) {
        console.error('Failed to load audio buffer')
        setIsLoadingSound(null)
        return
      }
      
      console.log('Creating seamless loop...')
      const volume = getSoundVolume(soundId) / 100
      const { source, gain } = await createSeamlessLoop(buffer, volume)
      
      // Store references
      setSourceNode(source)
      setGainNode(gain)
      setAudioBuffer(buffer)
      
      // Start playing
      source.start()
      
      setSelectedAmbientSound(soundId)
      setIsAmbientPlaying(true)
      setIsLoadingSound(null)
      console.log('Audio started with seamless looping')
    } catch (error) {
      console.error('Error playing sound:', error)
      setIsLoadingSound(null)
    }
  }

  // Stop ambient sound
  const stopAmbientSound = () => {
    if (sourceNode) {
      try {
        sourceNode.stop()
      } catch (error) {
        // Source might already be stopped
      }
      setSourceNode(null)
    }
    if (gainNode) {
      gainNode.disconnect()
      setGainNode(null)
    }
    setAudioBuffer(null)
    setSelectedAmbientSound(null)
    setIsAmbientPlaying(false)
    console.log('Audio stopped')
  }

  // Toggle ambient sound
  const toggleAmbientSound = (soundId: string) => {
    if (selectedAmbientSound === soundId) {
      stopAmbientSound()
    } else {
      playAmbientSound(soundId)
    }
  }

  // Weather effects toggle
  const toggleWeatherEffect = (effect: 'none' | 'rain' | 'snow') => {
    setWeatherEffect(effect)
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sourceNode) {
        try {
          sourceNode.stop()
        } catch (error) {
          // Source might already be stopped
        }
      }
      if (gainNode) {
        gainNode.disconnect()
      }
      if (audioContext && audioContext.state !== 'closed') {
        try {
          audioContext.close()
        } catch (error) {
          // Context might already be closed
        }
      }
    }
  }, [sourceNode, gainNode, audioContext])
  const [showCongrats, setShowCongrats] = useState(false)
  const [congratsMessage, setCongratsMessage] = useState('')
  const [showBreakComplete, setShowBreakComplete] = useState(false)
  const [breakMessage, setBreakMessage] = useState('')
  const [showThemes, setShowThemes] = useState(false)
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<'liveBackground' | 'colors' | 'ambient'>('colors')
  const [selectedSettingsCategory, setSelectedSettingsCategory] = useState('themes')
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [currentAnimation, setCurrentAnimation] = useState<any>(null)
  const animationRef = useRef<HTMLDivElement>(null)
  const [themeMixingEnabled, setThemeMixingEnabled] = useState(false)
  const [activeThemes, setActiveThemes] = useState<string[]>([])
  const [compatibilityMatrix, setCompatibilityMatrix] = useState<Map<string, string[]>>(new Map())
  
  
  // Timer durations (in minutes)
  const [durations, setDurations] = useState({
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  })
  
  // Session history
  const [sessions, setSessions] = useState<Session[]>([])
  const [isCompleting, setIsCompleting] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Timer modes configuration
  const timerModes = {
    focus: { 
      label: 'Focus', 
      color: 'from-red-500 to-pink-600', 
      bgColor: 'bg-red-500/10',
      icon: Target,
      description: 'Deep work session'
    },
    shortBreak: { 
      label: 'Short Break', 
      color: 'from-green-500 to-emerald-600', 
      bgColor: 'bg-green-500/10',
      icon: Coffee,
      description: 'Quick refresh'
    },
    longBreak: { 
      label: 'Long Break', 
      color: 'from-blue-500 to-indigo-600', 
      bgColor: 'bg-blue-500/10',
      icon: Moon,
      description: 'Extended rest'
    }
  }


  // Ambient Sounds System - Only sounds that are available in the sounds folder
  const ambientSounds = [
    // Nature Sounds
    { 
      id: 'heavy-rain', 
      name: 'Heavy Rain', 
      emoji: '⛈️', 
      category: 'nature',
      file: '370284__ztitchez__rain-heavy-early-morning_01.wav'
    },
    { 
      id: 'wind', 
      name: 'Stormy Winds', 
      emoji: '💨', 
      category: 'nature',
      file: '502523__simon-spiers__stormy-winds-through-the-trees.mp3'
    },
    { 
      id: 'snowfall', 
      name: 'Snowfall', 
      emoji: '❄️', 
      category: 'nature',
      file: '262259__shadydave__snowfall-final.mp3'
    },
    { 
      id: 'birds-lake', 
      name: 'Birds by the Lake', 
      emoji: '🐦', 
      category: 'nature',
      file: '524853__ellanjellan__birds-bythelake.wav'
    },
    { 
      id: 'campfire', 
      name: 'Campfire', 
      emoji: '🪵', 
      category: 'nature',
      file: '660297__ambient-x__campfire-deer-camp-hot-air-leaking-from-wet-wood-part-3.wav'
    },
    { 
      id: 'forest-river', 
      name: 'Forest & River', 
      emoji: '🌲', 
      category: 'nature',
      file: '758785__garuda1982__forest-ambiance-with-flowing-river-distant-church-bells-and-joggers.wav'
    },
    { 
      id: 'ocean-waves', 
      name: 'Ocean Waves', 
      emoji: '🌊', 
      category: 'nature',
      file: '790545__dudeawesome__wind-chimes-water-droplets-and-ocean-waves-loop.flac'
    }
  ]

  // Sound categories for filtering
  const soundCategories = [
    { id: 'all', name: 'All' },
    { id: 'nature', name: 'Nature' }
  ]

  // Completion sounds (for session end notifications)
  const completionSounds = [
    { id: 'bell', name: 'Bell', emoji: '🔔' },
    { id: 'chime', name: 'Chime', emoji: '🎵' },
    { id: 'ding', name: 'Ding', emoji: '🔔' },
    { id: 'pop', name: 'Pop', emoji: '💥' },
    { id: 'whoosh', name: 'Whoosh', emoji: '💨' },
    { id: 'tada', name: 'Tada', emoji: '🎉' },
    { id: 'success', name: 'Success', emoji: '✅' },
    { id: 'notification', name: 'Notification', emoji: '📱' },
    { id: 'achievement', name: 'Achievement', emoji: '🏆' },
    { id: 'zen', name: 'Zen', emoji: '🧘' }
  ]

  // Timer Designs
  const timerDesigns = [
    { id: 'default', name: 'Default', emoji: '⏰', description: 'Clean and minimal', hasCircle: true },
    { id: 'transparent', name: 'Transparent', emoji: '💎', description: 'Glass-like transparency', hasCircle: false },
    { id: 'neon', name: 'Neon', emoji: '⚡', description: 'Electric glow effect', hasCircle: true },
    { id: 'gradient', name: 'Gradient', emoji: '🌈', description: 'Colorful flowing gradients', hasCircle: true },
    { id: 'glassmorphism', name: 'Glassmorphism', emoji: '🔮', description: 'Frosted glass effect', hasCircle: true },
    { id: 'retro', name: 'Retro', emoji: '📺', description: '80s synthwave vibes', hasCircle: false },
    { id: 'cyber', name: 'Cyber', emoji: '🤖', description: 'Matrix-style digital', hasCircle: false },
    { id: 'nature', name: 'Nature', emoji: '🌿', description: 'Organic green tones', hasCircle: true },
    { id: 'space', name: 'Space', emoji: '🌌', description: 'Cosmic starfield', hasCircle: true },
    { id: 'ocean', name: 'Ocean', emoji: '🌊', description: 'Deep blue waves', hasCircle: true },
    { id: 'fire', name: 'Fire', emoji: '🔥', description: 'Flaming hot energy', hasCircle: false },
    { id: 'ice', name: 'Ice', emoji: '❄️', description: 'Frozen crystal clear', hasCircle: true },
    { id: 'gold', name: 'Gold', emoji: '✨', description: 'Luxurious golden shine', hasCircle: true },
    { id: 'silver', name: 'Silver', emoji: '🥈', description: 'Metallic silver finish', hasCircle: true },
    { id: 'rainbow', name: 'Rainbow', emoji: '🌈', description: 'Full spectrum colors', hasCircle: true },
    { id: 'monochrome', name: 'Monochrome', emoji: '⚫', description: 'Black and white classic', hasCircle: false },
    { id: 'holographic', name: 'Holographic', emoji: '💿', description: 'Iridescent shimmer', hasCircle: true },
    { id: 'wood', name: 'Wood', emoji: '🪵', description: 'Natural wood grain', hasCircle: true },
    { id: 'marble', name: 'Marble', emoji: '🏛️', description: 'Elegant stone texture', hasCircle: true },
    { id: 'crystal', name: 'Crystal', emoji: '💎', description: 'Pure crystal clarity', hasCircle: true },
    { id: 'neon-pink', name: 'Neon Pink', emoji: '💖', description: 'Hot pink glow', hasCircle: false },
    { id: 'midnight', name: 'Midnight', emoji: '🌙', description: 'Deep night sky', hasCircle: true },
    { id: 'sunset', name: 'Sunset', emoji: '🌅', description: 'Warm sunset colors', hasCircle: true },
    { id: 'aurora', name: 'Aurora', emoji: '🌌', description: 'Northern lights dance', hasCircle: true },
    
    // New Beautiful Designs
    { id: 'minimalist', name: 'Minimalist', emoji: '⚪', description: 'Clean and simple', hasCircle: false },
    { id: 'vintage', name: 'Vintage', emoji: '📺', description: 'Classic retro style', hasCircle: false },
    { id: 'cosmic', name: 'Cosmic', emoji: '🌠', description: 'Starry night sky', hasCircle: true },
    { id: 'forest', name: 'Forest', emoji: '🌲', description: 'Deep woodland vibes', hasCircle: true },
    { id: 'sunrise', name: 'Sunrise', emoji: '🌄', description: 'Morning golden hour', hasCircle: true },
    { id: 'moonlight', name: 'Moonlight', emoji: '🌙', description: 'Silvery moon glow', hasCircle: true },
    { id: 'coral', name: 'Coral', emoji: '🪸', description: 'Ocean coral reef', hasCircle: true },
    { id: 'lavender', name: 'Lavender', emoji: '💜', description: 'Soft purple fields', hasCircle: true },
    { id: 'emerald', name: 'Emerald', emoji: '💚', description: 'Rich green gemstone', hasCircle: true },
    { id: 'sapphire', name: 'Sapphire', emoji: '💙', description: 'Deep blue crystal', hasCircle: true },
    { id: 'ruby', name: 'Ruby', emoji: '❤️', description: 'Deep red gemstone', hasCircle: true },
    { id: 'diamond', name: 'Diamond', emoji: '💎', description: 'Brilliant white sparkle', hasCircle: true },
    { id: 'copper', name: 'Copper', emoji: '🟤', description: 'Warm metallic finish', hasCircle: true },
    { id: 'steel', name: 'Steel', emoji: '⚙️', description: 'Industrial metallic', hasCircle: false },
    { id: 'rose-gold', name: 'Rose Gold', emoji: '🌹', description: 'Elegant pink gold', hasCircle: true },
    { id: 'platinum', name: 'Platinum', emoji: '⚪', description: 'Luxurious white metal', hasCircle: true },
    { id: 'bronze', name: 'Bronze', emoji: '🏺', description: 'Ancient bronze patina', hasCircle: true },
    { id: 'titanium', name: 'Titanium', emoji: '🔩', description: 'Modern titanium finish', hasCircle: false },
    { id: 'pearl', name: 'Pearl', emoji: '🦪', description: 'Iridescent pearl shine', hasCircle: true },
    { id: 'opal', name: 'Opal', emoji: '🌈', description: 'Rainbow opal fire', hasCircle: true },
    { id: 'amethyst', name: 'Amethyst', emoji: '💜', description: 'Purple crystal energy', hasCircle: true },
    { id: 'citrine', name: 'Citrine', emoji: '🍋', description: 'Golden yellow crystal', hasCircle: true },
    { id: 'aquamarine', name: 'Aquamarine', emoji: '🌊', description: 'Sea-blue gemstone', hasCircle: true },
    { id: 'topaz', name: 'Topaz', emoji: '💛', description: 'Golden topaz glow', hasCircle: true },
    
    // New Unique Designs - Very Different Styles
    { id: 'massive', name: 'Massive', emoji: '📏', description: 'Huge screen-filling text', hasCircle: false },
    { id: 'split-screen', name: 'Split Screen', emoji: '📱', description: 'Divided display sections', hasCircle: false },
    { id: 'floating', name: 'Floating', emoji: '🎈', description: 'Floating numbers in space', hasCircle: false },
    { id: 'typewriter', name: 'Typewriter', emoji: '⌨️', description: 'Classic typewriter style', hasCircle: false },
    { id: 'led-display', name: 'LED Display', emoji: '🔢', description: 'Digital LED matrix', hasCircle: false },
    { id: 'neon-sign', name: 'Neon Sign', emoji: '💡', description: 'Glowing neon letters', hasCircle: false },
    { id: 'hologram', name: 'Hologram', emoji: '👻', description: '3D holographic effect', hasCircle: false },
    { id: 'water-drop', name: 'Water Drop', emoji: '💧', description: 'Liquid water effect', hasCircle: false },
    { id: 'smoke', name: 'Smoke', emoji: '💨', description: 'Smoky ethereal text', hasCircle: false },
    { id: 'glitch', name: 'Glitch', emoji: '⚡', description: 'Digital glitch effect', hasCircle: false },
    { id: 'mosaic', name: 'Mosaic', emoji: '🧩', description: 'Pixel mosaic tiles', hasCircle: false },
    { id: 'origami', name: 'Origami', emoji: '📄', description: 'Folded paper effect', hasCircle: false },
    { id: 'chalkboard', name: 'Chalkboard', emoji: '🖍️', description: 'Hand-drawn chalk style', hasCircle: false },
    { id: 'neon-tube', name: 'Neon Tube', emoji: '🔮', description: 'Glass tube lighting', hasCircle: false },
    { id: 'crystal-grow', name: 'Crystal Grow', emoji: '🔮', description: 'Growing crystal formation', hasCircle: false },
    { id: 'magnetic', name: 'Magnetic', emoji: '🧲', description: 'Magnetic field distortion', hasCircle: false },
    { id: 'liquid-metal', name: 'Liquid Metal', emoji: '🌊', description: 'Flowing metal surface', hasCircle: false },
    { id: 'energy-field', name: 'Energy Field', emoji: '⚡', description: 'Electric energy waves', hasCircle: false },
    { id: 'quantum', name: 'Quantum', emoji: '⚛️', description: 'Quantum particle effect', hasCircle: false },
    { id: 'time-vortex', name: 'Time Vortex', emoji: '🌀', description: 'Spinning time portal', hasCircle: false },
    
    // Final 6 Unique Designs
    { id: 'giant', name: 'Giant', emoji: '🏗️', description: 'Massive construction text', hasCircle: false },
    { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🤖', description: 'Futuristic neon city', hasCircle: false },
    { id: 'matrix-code', name: 'Matrix Code', emoji: '💚', description: 'Falling green code', hasCircle: false },
    { id: 'laser', name: 'Laser', emoji: '🔴', description: 'Cutting laser beam', hasCircle: false },
    { id: 'plasma', name: 'Plasma', emoji: '⚡', description: 'Electric plasma field', hasCircle: false },
    { id: 'void', name: 'Void', emoji: '🕳️', description: 'Infinite dark space', hasCircle: false }
  ]

  // Enhanced Themes with Categories
  const themeCategories = {
    liveBackground: [
      {
        id: 'rain-animated',
        name: 'Gentle Rain',
        gradient: 'from-slate-800 via-slate-700 to-slate-900',
        primaryColor: 'blue',
        description: 'Peaceful rain for deep focus',
        category: 'liveBackground' as const,
        emoji: '🌧️',
        type: 'animated' as const,
        animationType: 'rain' as const
      },
      {
        id: 'snow-animated',
        name: 'Winter Snow',
        gradient: 'from-blue-100 via-blue-200 to-blue-300',
        primaryColor: 'blue',
        description: 'Calming snowflakes falling',
        category: 'liveBackground' as const,
        emoji: '❄️',
        type: 'animated' as const,
        animationType: 'snow' as const
      },
      {
        id: 'thunderstorm',
        name: 'Thunderstorm',
        gradient: 'from-gray-900 via-gray-800 to-black',
        primaryColor: 'purple',
        description: 'Dramatic storm for intense focus',
        category: 'liveBackground' as const,
        emoji: '⛈️',
        type: 'animated' as const,
        animationType: 'thunderstorm' as const
      },
      {
        id: 'galaxy',
        name: 'Galaxy Stars',
        gradient: 'from-purple-900 via-indigo-900 to-black',
        primaryColor: 'purple',
        description: 'Twinkling stars in deep space',
        category: 'liveBackground' as const,
        emoji: '🌌',
        type: 'animated' as const,
        animationType: 'galaxy' as const
      },
      {
        id: 'aurora',
        name: 'Northern Lights',
        gradient: 'from-green-900 via-blue-900 to-purple-900',
        primaryColor: 'green',
        description: 'Magical aurora borealis',
        category: 'liveBackground' as const,
        emoji: '🌌',
        type: 'animated' as const,
        animationType: 'aurora' as const
      },
      {
        id: 'ocean',
        name: 'Ocean Waves',
        gradient: 'from-blue-400 via-blue-600 to-blue-800',
        primaryColor: 'blue',
        description: 'Rhythmic ocean waves',
        category: 'liveBackground' as const,
        emoji: '🌊',
        type: 'animated' as const,
        animationType: 'ocean' as const
      },
      {
        id: 'forest',
        name: 'Forest Breeze',
        gradient: 'from-green-400 via-green-600 to-green-800',
        primaryColor: 'green',
        description: 'Falling leaves in the forest',
        category: 'liveBackground' as const,
        emoji: '🍃',
        type: 'animated' as const,
        animationType: 'forest' as const
      },
      {
        id: 'particles',
        name: 'Floating Particles',
        gradient: 'from-purple-600 via-pink-600 to-indigo-600',
        primaryColor: 'purple',
        description: 'Gentle floating particles',
        category: 'liveBackground' as const,
        emoji: '✨',
        type: 'animated' as const,
        animationType: 'particles' as const
      },
      {
        id: 'geometric',
        name: 'Geometric Flow',
        gradient: 'from-orange-500 via-red-500 to-pink-500',
        primaryColor: 'orange',
        description: 'Rotating geometric patterns',
        category: 'liveBackground' as const,
        emoji: '🔷',
        type: 'animated' as const,
        animationType: 'geometric' as const
      },
      {
        id: 'fire',
        name: 'Warm Fire',
        gradient: 'from-red-900 via-orange-900 to-yellow-900',
        primaryColor: 'red',
        description: 'Flickering flames for warmth',
        category: 'liveBackground' as const,
        emoji: '🔥',
        type: 'animated' as const,
        animationType: 'fire' as const
      },
      {
        id: 'smoke',
        name: 'Mystical Smoke',
        gradient: 'from-gray-700 via-gray-600 to-gray-800',
        primaryColor: 'gray',
        description: 'Rising smoke clouds',
        category: 'liveBackground' as const,
        emoji: '💨',
        type: 'animated' as const,
        animationType: 'smoke' as const
      },
      {
        id: 'matrix-animated',
        name: 'Matrix Rain',
        gradient: 'from-black via-green-900 to-black',
        primaryColor: 'green',
        description: 'Digital code falling like rain',
        category: 'liveBackground' as const,
        emoji: '💚',
        type: 'animated' as const,
        animationType: 'matrix' as const
      },
      {
        id: 'neon',
        name: 'Neon City',
        gradient: 'from-purple-900 via-indigo-900 to-black',
        primaryColor: 'cyan',
        description: 'Cyberpunk city with neon lights',
        category: 'liveBackground' as const,
        emoji: '🌃',
        type: 'animated' as const,
        animationType: 'neon' as const
      },
      {
        id: 'underwater',
        name: 'Underwater Bubbles',
        gradient: 'from-blue-400 via-blue-600 to-blue-800',
        primaryColor: 'blue',
        description: 'Peaceful underwater with rising bubbles',
        category: 'liveBackground' as const,
        emoji: '🐠',
        type: 'animated' as const,
        animationType: 'underwater' as const
      },
      {
        id: 'glitch',
        name: 'Digital Glitch',
        gradient: 'from-black via-purple-900 to-indigo-900',
        primaryColor: 'green',
        description: 'Retro digital glitch effects',
        category: 'liveBackground' as const,
        emoji: '⚡',
        type: 'animated' as const,
        animationType: 'glitch' as const
      },
      {
        id: 'sunset',
        name: 'Sunset Clouds',
        gradient: 'from-orange-400 via-pink-500 to-purple-600',
        primaryColor: 'orange',
        description: 'Beautiful sunset with floating clouds',
        category: 'liveBackground' as const,
        emoji: '🌅',
        type: 'animated' as const,
        animationType: 'sunset' as const
      },
      {
        id: 'cyberpunk',
        name: 'Cyberpunk Grid',
        gradient: 'from-black via-purple-900 to-indigo-900',
        primaryColor: 'cyan',
        description: 'Futuristic grid with glowing nodes',
        category: 'liveBackground' as const,
        emoji: '🔮',
        type: 'animated' as const,
        animationType: 'cyberpunk' as const
      },
      {
        id: 'sparkles',
        name: 'Magical Sparkles',
        gradient: 'from-purple-500 via-pink-500 to-blue-500',
        primaryColor: 'pink',
        description: 'Twinkling magical sparkles',
        category: 'liveBackground' as const,
        emoji: '✨',
        type: 'animated' as const,
        animationType: 'sparkles' as const
      },
      {
        id: 'lava',
        name: 'Lava Flow',
        gradient: 'from-red-900 via-orange-600 to-yellow-500',
        primaryColor: 'red',
        description: 'Molten lava with bubbling effects',
        category: 'liveBackground' as const,
        emoji: '🌋',
        type: 'animated' as const,
        animationType: 'lava' as const
      },
      {
        id: 'video1',
        name: 'Cosmic Journey',
        gradient: 'from-purple-900 via-indigo-900 to-black',
        primaryColor: 'purple',
        description: 'Mesmerizing cosmic video background',
        category: 'liveBackground' as const,
        emoji: '🌌',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/204241-923909574_small.mp4'
      },
      {
        id: 'video2',
        name: 'Ocean Depths',
        gradient: 'from-blue-900 via-cyan-900 to-teal-900',
        primaryColor: 'blue',
        description: 'Deep ocean video with flowing water',
        category: 'liveBackground' as const,
        emoji: '🌊',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/208106_small.mp4'
      },
      {
        id: 'video3',
        name: 'Forest Serenity',
        gradient: 'from-green-900 via-emerald-900 to-teal-900',
        primaryColor: 'green',
        description: 'Peaceful forest video background',
        category: 'liveBackground' as const,
        emoji: '🌲',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/208812_small.mp4'
      },
      {
        id: 'video4',
        name: 'Mountain Vista',
        gradient: 'from-gray-800 via-slate-700 to-gray-900',
        primaryColor: 'gray',
        description: 'Majestic mountain landscape video',
        category: 'liveBackground' as const,
        emoji: '⛰️',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/209204_large.mp4'
      },
      {
        id: 'video5',
        name: 'Urban Lights',
        gradient: 'from-orange-900 via-red-900 to-purple-900',
        primaryColor: 'orange',
        description: 'Dynamic city lights video',
        category: 'liveBackground' as const,
        emoji: '🏙️',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/270983.mp4'
      },
      {
        id: 'video6',
        name: 'Abstract Flow',
        gradient: 'from-pink-600 via-purple-600 to-indigo-600',
        primaryColor: 'pink',
        description: 'Flowing abstract video patterns',
        category: 'liveBackground' as const,
        emoji: '🎨',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/276498_small.mp4'
      },
      {
        id: 'video7',
        name: 'Desert Sunset',
        gradient: 'from-yellow-600 via-orange-600 to-red-600',
        primaryColor: 'yellow',
        description: 'Warm desert sunset video',
        category: 'liveBackground' as const,
        emoji: '🏜️',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/297736_small.mp4'
      },
      {
        id: 'video8',
        name: 'Digital Waves',
        gradient: 'from-cyan-600 via-blue-600 to-purple-600',
        primaryColor: 'cyan',
        description: 'Futuristic digital wave patterns',
        category: 'liveBackground' as const,
        emoji: '💫',
        type: 'animated' as const,
        videoBackground: '/ambient-themes/animated/301247_small.mp4'
      }
    ],
    colors: [
      { 
        id: 'purple', 
        name: 'Purple Dreams', 
        gradient: 'from-purple-500 to-pink-500',
        primaryColor: 'purple',
        description: 'Soft purple gradient',
        category: 'colors' as const,
        emoji: '💜'
      },
      { 
        id: 'sunset-colors', 
        name: 'Sunset Vibes', 
        gradient: 'from-orange-400 to-pink-400',
        primaryColor: 'orange',
        description: 'Warm sunset colors',
        category: 'colors' as const,
        emoji: '🌅'
      },
      { 
        id: 'forest-deep', 
        name: 'Forest Deep', 
        gradient: 'from-green-600 to-emerald-500',
        primaryColor: 'green',
        description: 'Deep forest green',
        category: 'colors' as const,
        emoji: '🌲'
      },
      { 
        id: 'ocean-colors', 
        name: 'Ocean Depths', 
        gradient: 'from-blue-500 to-cyan-400',
        primaryColor: 'blue',
        description: 'Deep ocean blue',
        category: 'colors' as const,
        emoji: '🌊'
      },
      { 
        id: 'cosmic', 
        name: 'Cosmic Space', 
        gradient: 'from-indigo-600 to-purple-600',
        primaryColor: 'indigo',
        description: 'Deep space colors',
        category: 'colors' as const,
        emoji: '🌌'
      },
      { 
        id: 'minimal', 
        name: 'Minimal Gray', 
        gradient: 'from-gray-600 to-gray-400',
        primaryColor: 'gray',
        description: 'Clean minimal look',
        category: 'colors' as const,
        emoji: '⚫'
      },
      { 
        id: 'rose', 
        name: 'Rose Gold', 
        gradient: 'from-rose-400 to-yellow-400',
        primaryColor: 'rose',
        description: 'Elegant rose gold',
        category: 'colors' as const,
        emoji: '🌹'
      },
      { 
        id: 'emerald-city', 
        name: 'Emerald City', 
        gradient: 'from-emerald-500 to-teal-500',
        primaryColor: 'emerald',
        description: 'Rich emerald green',
        category: 'colors' as const,
        emoji: '💚'
      },
      { 
        id: 'aurora-colors', 
        name: 'Aurora Borealis', 
        gradient: 'from-purple-500 via-pink-500 to-blue-500',
        primaryColor: 'purple',
        description: 'Northern lights dancing',
        category: 'colors' as const,
        emoji: '🌌'
      },
      { 
        id: 'galaxy-colors', 
        name: 'Galaxy Spiral', 
        gradient: 'from-indigo-900 via-purple-900 to-pink-900',
        primaryColor: 'indigo',
        description: 'Cosmic spiral galaxy',
        category: 'colors' as const,
        emoji: '🌌'
      },
      { 
        id: 'fire-colors', 
        name: 'Flickering Fire', 
        gradient: 'from-red-500 via-orange-500 to-yellow-500',
        primaryColor: 'red',
        description: 'Warm campfire glow',
        category: 'colors' as const,
        emoji: '🔥'
      },
      { 
        id: 'waves', 
        name: 'Ocean Waves', 
        gradient: 'from-blue-400 via-cyan-400 to-teal-400',
        primaryColor: 'blue',
        description: 'Gentle ocean waves',
        category: 'colors' as const,
        emoji: '🌊'
      },
      { 
        id: 'particles', 
        name: 'Floating Particles', 
        gradient: 'from-gray-600 via-gray-500 to-gray-400',
        primaryColor: 'gray',
        description: 'Floating light particles',
        category: 'colors' as const,
        emoji: '✨'
      },
      { 
        id: 'matrix-colors', 
        name: 'Matrix Rain', 
        gradient: 'from-green-600 via-green-500 to-green-400',
        primaryColor: 'green',
        description: 'Digital rain effect',
        category: 'colors' as const,
        emoji: '💚'
      },
      { 
        id: 'zen-colors', 
        name: 'Zen Garden', 
        gradient: 'from-stone-400 to-stone-300',
        primaryColor: 'stone',
        description: 'Peaceful zen atmosphere',
        category: 'colors' as const,
        emoji: '🧘'
      },
      { 
        id: 'library', 
        name: 'Cozy Library', 
        gradient: 'from-amber-600 to-orange-500',
        primaryColor: 'amber',
        description: 'Warm library ambiance',
        category: 'colors' as const,
        emoji: '📚'
      },
      { 
        id: 'coffee', 
        name: 'Coffee Shop', 
        gradient: 'from-amber-700 to-yellow-600',
        primaryColor: 'amber',
        description: 'Coffee shop vibes',
        category: 'colors' as const,
        emoji: '☕'
      },
      { 
        id: 'rainy', 
        name: 'Rainy Day', 
        gradient: 'from-slate-500 to-slate-400',
        primaryColor: 'slate',
        description: 'Gentle rain sounds',
        category: 'colors' as const,
        emoji: '🌧️'
      },
      { 
        id: 'city', 
        name: 'Midnight City', 
        gradient: 'from-slate-700 to-slate-600',
        primaryColor: 'slate',
        description: 'Urban night atmosphere',
        category: 'colors' as const,
        emoji: '🌃'
      },
      { 
        id: 'mountain', 
        name: 'Mountain Peak', 
        gradient: 'from-slate-400 to-slate-300',
        primaryColor: 'slate',
        description: 'Mountain serenity',
        category: 'colors' as const,
        emoji: '🏔️'
      },
      { 
        id: 'lavender', 
        name: 'Lavender Fields', 
        gradient: 'from-purple-300 via-pink-300 to-indigo-300',
        primaryColor: 'purple',
        description: 'Soft lavender dream',
        category: 'colors' as const,
        emoji: '💜'
      },
      { 
        id: 'coral-reef', 
        name: 'Coral Reef', 
        gradient: 'from-orange-400 via-pink-400 to-red-400',
        primaryColor: 'orange',
        description: 'Vibrant coral beauty',
        category: 'colors' as const,
        emoji: '🪸'
      },
      { 
        id: 'mint', 
        name: 'Mint Fresh', 
        gradient: 'from-green-300 via-emerald-300 to-teal-300',
        primaryColor: 'green',
        description: 'Cool mint refresh',
        category: 'colors' as const,
        emoji: '🌿'
      },
      { 
        id: 'peach', 
        name: 'Peach Sunset', 
        gradient: 'from-orange-300 via-pink-300 to-yellow-300',
        primaryColor: 'orange',
        description: 'Warm peach glow',
        category: 'colors' as const,
        emoji: '🍑'
      },
      { 
        id: 'turquoise', 
        name: 'Turquoise Waters', 
        gradient: 'from-cyan-400 via-teal-400 to-blue-400',
        primaryColor: 'cyan',
        description: 'Crystal clear waters',
        category: 'colors' as const,
        emoji: '💎'
      },
      { 
        id: 'golden', 
        name: 'Golden Hour', 
        gradient: 'from-yellow-400 via-amber-400 to-orange-400',
        primaryColor: 'yellow',
        description: 'Magical golden light',
        category: 'colors' as const,
        emoji: '✨'
      },
      { 
        id: 'plum', 
        name: 'Deep Plum', 
        gradient: 'from-purple-700 via-violet-700 to-indigo-700',
        primaryColor: 'purple',
        description: 'Rich plum depth',
        category: 'colors' as const,
        emoji: '🍇'
      },
      { 
        id: 'sage', 
        name: 'Sage Wisdom', 
        gradient: 'from-green-400 via-slate-400 to-gray-400',
        primaryColor: 'green',
        description: 'Calming sage tones',
        category: 'colors' as const,
        emoji: '🌱'
      },
      { 
        id: 'cherry', 
        name: 'Cherry Blossom', 
        gradient: 'from-pink-300 via-rose-300 to-red-300',
        primaryColor: 'pink',
        description: 'Delicate cherry bloom',
        category: 'colors' as const,
        emoji: '🌸'
      },
      { 
        id: 'midnight', 
        name: 'Midnight Blue', 
        gradient: 'from-blue-900 via-indigo-900 to-purple-900',
        primaryColor: 'blue',
        description: 'Deep midnight mystery',
        category: 'colors' as const,
        emoji: '🌙'
      },
      { 
        id: 'apricot', 
        name: 'Apricot Dreams', 
        gradient: 'from-orange-300 via-yellow-300 to-pink-300',
        primaryColor: 'orange',
        description: 'Sweet apricot delight',
        category: 'colors' as const,
        emoji: '🍊'
      },
      { 
        id: 'jade', 
        name: 'Jade Serenity', 
        gradient: 'from-emerald-400 via-green-400 to-teal-400',
        primaryColor: 'emerald',
        description: 'Peaceful jade calm',
        category: 'colors' as const,
        emoji: '🟢'
      },
      { 
        id: 'crimson', 
        name: 'Crimson Passion', 
        gradient: 'from-red-600 via-rose-600 to-pink-600',
        primaryColor: 'red',
        description: 'Intense crimson fire',
        category: 'colors' as const,
        emoji: '❤️'
      },
      { 
        id: 'silver', 
        name: 'Silver Mist', 
        gradient: 'from-gray-300 via-slate-300 to-zinc-300',
        primaryColor: 'gray',
        description: 'Elegant silver shimmer',
        category: 'colors' as const,
        emoji: '⚪'
      },
      { 
        id: 'tangerine', 
        name: 'Tangerine Burst', 
        gradient: 'from-orange-500 via-red-500 to-yellow-500',
        primaryColor: 'orange',
        description: 'Zesty tangerine energy',
        category: 'colors' as const,
        emoji: '🧡'
      },
      { 
        id: 'periwinkle', 
        name: 'Periwinkle Sky', 
        gradient: 'from-blue-300 via-indigo-300 to-purple-300',
        primaryColor: 'blue',
        description: 'Soft periwinkle clouds',
        category: 'colors' as const,
        emoji: '☁️'
      },
      { 
        id: 'mahogany', 
        name: 'Mahogany Rich', 
        gradient: 'from-red-800 via-amber-800 to-orange-800',
        primaryColor: 'red',
        description: 'Luxurious mahogany wood',
        category: 'colors' as const,
        emoji: '🪵'
      },
      { 
        id: 'lime', 
        name: 'Lime Zest', 
        gradient: 'from-lime-400 via-green-400 to-yellow-400',
        primaryColor: 'lime',
        description: 'Fresh lime zing',
        category: 'colors' as const,
        emoji: '🍋'
      },
      { 
        id: 'violet', 
        name: 'Violet Dreams', 
        gradient: 'from-violet-500 via-purple-500 to-indigo-500',
        primaryColor: 'violet',
        description: 'Mystical violet magic',
        category: 'colors' as const,
        emoji: '🔮'
      },
      { 
        id: 'copper', 
        name: 'Copper Glow', 
        gradient: 'from-orange-600 via-amber-600 to-yellow-600',
        primaryColor: 'orange',
        description: 'Warm copper shine',
        category: 'colors' as const,
        emoji: '🥉'
      },
      { 
        id: 'minty', 
        name: 'Minty Fresh', 
        gradient: 'from-green-200 via-emerald-200 to-teal-200',
        primaryColor: 'green',
        description: 'Cool mint breeze',
        category: 'colors' as const,
        emoji: '🌬️'
      },
      { 
        id: 'burgundy', 
        name: 'Burgundy Wine', 
        gradient: 'from-red-800 via-purple-800 to-indigo-800',
        primaryColor: 'red',
        description: 'Rich burgundy depth',
        category: 'colors' as const,
        emoji: '🍷'
      },
      { 
        id: 'canary', 
        name: 'Canary Yellow', 
        gradient: 'from-yellow-300 via-amber-300 to-orange-300',
        primaryColor: 'yellow',
        description: 'Bright canary cheer',
        category: 'colors' as const,
        emoji: '🐤'
      },
      { 
        id: 'navy', 
        name: 'Navy Deep', 
        gradient: 'from-blue-800 via-indigo-800 to-slate-800',
        primaryColor: 'blue',
        description: 'Professional navy depth',
        category: 'colors' as const,
        emoji: '⚓'
      },
      { 
        id: 'fuchsia', 
        name: 'Fuchsia Flash', 
        gradient: 'from-pink-500 via-purple-500 to-red-500',
        primaryColor: 'pink',
        description: 'Bold fuchsia energy',
        category: 'colors' as const,
        emoji: '💖'
      },
      { 
        id: 'olive', 
        name: 'Olive Branch', 
        gradient: 'from-green-600 via-yellow-600 to-amber-600',
        primaryColor: 'green',
        description: 'Natural olive harmony',
        category: 'colors' as const,
        emoji: '🫒'
      },
      { 
        id: 'azure', 
        name: 'Azure Sky', 
        gradient: 'from-blue-400 via-cyan-400 to-teal-400',
        primaryColor: 'blue',
        description: 'Clear azure heavens',
        category: 'colors' as const,
        emoji: '☀️'
      },
      { 
        id: 'maroon', 
        name: 'Maroon Majesty', 
        gradient: 'from-red-900 via-purple-900 to-indigo-900',
        primaryColor: 'red',
        description: 'Regal maroon elegance',
        category: 'colors' as const,
        emoji: '👑'
      },
      { 
        id: 'lilac', 
        name: 'Lilac Breeze', 
        gradient: 'from-purple-200 via-pink-200 to-indigo-200',
        primaryColor: 'purple',
        description: 'Gentle lilac whisper',
        category: 'colors' as const,
        emoji: '🌺'
      },
      { 
        id: 'bronze', 
        name: 'Bronze Age', 
        gradient: 'from-amber-700 via-orange-700 to-yellow-700',
        primaryColor: 'amber',
        description: 'Ancient bronze wisdom',
        category: 'colors' as const,
        emoji: '🏛️'
      },
      { 
        id: 'teal', 
        name: 'Teal Tranquility', 
        gradient: 'from-teal-400 via-cyan-400 to-blue-400',
        primaryColor: 'teal',
        description: 'Calming teal peace',
        category: 'colors' as const,
        emoji: '🦋'
      },
      { 
        id: 'scarlet', 
        name: 'Scarlet Fire', 
        gradient: 'from-red-500 via-orange-500 to-yellow-500',
        primaryColor: 'red',
        description: 'Burning scarlet flame',
        category: 'colors' as const,
        emoji: '🔥'
      },
      { 
        id: 'ivory', 
        name: 'Ivory Elegance', 
        gradient: 'from-stone-100 via-gray-100 to-slate-100',
        primaryColor: 'stone',
        description: 'Pure ivory grace',
        category: 'colors' as const,
        emoji: '🤍'
      },
      { 
        id: 'magenta', 
        name: 'Magenta Magic', 
        gradient: 'from-pink-600 via-purple-600 to-indigo-600',
        primaryColor: 'pink',
        description: 'Electric magenta power',
        category: 'colors' as const,
        emoji: '⚡'
      },
      { 
        id: 'forest-floor', 
        name: 'Forest Floor', 
        gradient: 'from-green-700 via-amber-700 to-brown-700',
        primaryColor: 'green',
        description: 'Natural forest earth',
        category: 'colors' as const,
        emoji: '🍃'
      },
      { 
        id: 'royal', 
        name: 'Royal Purple', 
        gradient: 'from-purple-600 via-violet-600 to-indigo-600',
        primaryColor: 'purple',
        description: 'Majestic royal purple',
        category: 'colors' as const,
        emoji: '👑'
      },
      { 
        id: 'coral-garden', 
        name: 'Coral Garden', 
        gradient: 'from-orange-400 via-pink-400 to-red-400',
        primaryColor: 'orange',
        description: 'Underwater coral beauty',
        category: 'colors' as const,
        emoji: '🪸'
      },
      { 
        id: 'steel', 
        name: 'Steel Gray', 
        gradient: 'from-gray-500 via-slate-500 to-zinc-500',
        primaryColor: 'gray',
        description: 'Industrial steel strength',
        category: 'colors' as const,
        emoji: '⚙️'
      },
      { 
        id: 'peacock', 
        name: 'Peacock Pride', 
        gradient: 'from-blue-500 via-teal-500 to-green-500',
        primaryColor: 'blue',
        description: 'Proud peacock feathers',
        category: 'colors' as const,
        emoji: '🦚'
      },
      { 
        id: 'ruby', 
        name: 'Ruby Red', 
        gradient: 'from-red-600 via-pink-600 to-purple-600',
        primaryColor: 'red',
        description: 'Precious ruby gem',
        category: 'colors' as const,
        emoji: '💎'
      },
      { 
        id: 'sapphire', 
        name: 'Sapphire Blue', 
        gradient: 'from-blue-600 via-indigo-600 to-purple-600',
        primaryColor: 'blue',
        description: 'Deep sapphire crystal',
        category: 'colors' as const,
        emoji: '💙'
      },
      { 
        id: 'emerald-forest', 
        name: 'Emerald Forest', 
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        primaryColor: 'emerald',
        description: 'Lush emerald woodland',
        category: 'colors' as const,
        emoji: '🌲'
      },
      { 
        id: 'amber', 
        name: 'Amber Glow', 
        gradient: 'from-amber-400 via-yellow-400 to-orange-400',
        primaryColor: 'amber',
        description: 'Warm amber radiance',
        category: 'colors' as const,
        emoji: '🟡'
      },
      { 
        id: 'diamond', 
        name: 'Diamond White', 
        gradient: 'from-white via-gray-100 to-slate-100',
        primaryColor: 'white',
        description: 'Brilliant diamond shine',
        category: 'colors' as const,
        emoji: '💎'
      }
    ],
    ambient: [
      {
        id: 'anime-cozy-home',
        name: 'Anime Cozy Home',
        gradient: 'from-purple-900 via-pink-900 to-indigo-900',
        primaryColor: 'purple',
        description: 'Anime-style cozy home interior',
        category: 'ambient' as const,
        emoji: '🏠',
        backgroundImage: '/ambient-themes/static/anime-style-cozy-home-interior-with-furnishings.jpg',
        type: 'static' as const
      },
      {
        id: 'bailey-unsplash',
        name: 'Mountain Vista',
        gradient: 'from-blue-900 via-indigo-900 to-purple-900',
        primaryColor: 'blue',
        description: 'Stunning mountain landscape',
        category: 'ambient' as const,
        emoji: '🏔️',
        backgroundImage: '/ambient-themes/static/bailey-zindel-NRQV-hBF10M-unsplash.jpg',
        type: 'static' as const
      },
      {
        id: 'beautiful-office',
        name: 'Beautiful Office',
        gradient: 'from-amber-900 via-orange-900 to-yellow-900',
        primaryColor: 'amber',
        description: 'Cartoon-style office space',
        category: 'ambient' as const,
        emoji: '💼',
        backgroundImage: '/ambient-themes/static/beautiful-office-space-cartoon-style.jpg',
        type: 'static' as const
      },
      {
        id: 'bedroom',
        name: 'Cozy Bedroom',
        gradient: 'from-pink-900 via-rose-900 to-purple-900',
        primaryColor: 'pink',
        description: 'Peaceful bedroom retreat',
        category: 'ambient' as const,
        emoji: '🛏️',
        backgroundImage: '/ambient-themes/static/bedroom.jpg',
        type: 'static' as const
      },
      {
        id: 'cabin',
        name: 'Rustic Cabin',
        gradient: 'from-green-900 via-emerald-900 to-teal-900',
        primaryColor: 'green',
        description: 'Wooden cabin in nature',
        category: 'ambient' as const,
        emoji: '🏡',
        backgroundImage: '/ambient-themes/static/Cabin.jpg',
        type: 'static' as const
      },
      {
        id: 'ciaran-unsplash',
        name: 'Urban Night',
        gradient: 'from-slate-900 via-gray-900 to-blue-900',
        primaryColor: 'slate',
        description: 'City lights at night',
        category: 'ambient' as const,
        emoji: '🌃',
        backgroundImage: '/ambient-themes/static/ciaran-o-brien-LoGWCnEVDgU-unsplash.jpg',
        type: 'static' as const
      },
      {
        id: 'convenience-store',
        name: 'Convenience Store',
        gradient: 'from-orange-900 via-red-900 to-pink-900',
        primaryColor: 'orange',
        description: 'Neon-lit convenience store',
        category: 'ambient' as const,
        emoji: '🏪',
        backgroundImage: '/ambient-themes/static/ConvinenceStore.jpg',
        type: 'static' as const
      },
      {
        id: 'countryside-morning',
        name: 'Countryside Morning',
        gradient: 'from-yellow-400 via-orange-400 to-green-400',
        primaryColor: 'yellow',
        description: 'Serene rolling hills',
        category: 'ambient' as const,
        emoji: '🌅',
        backgroundImage: '/ambient-themes/static/CountrysideMorning.jpg',
        type: 'static' as const
      },
      {
        id: 'cozy-apartment-sunset',
        name: 'Cozy Apartment Sunset',
        gradient: 'from-orange-900 via-pink-900 to-purple-900',
        primaryColor: 'orange',
        description: 'Sunset view from apartment',
        category: 'ambient' as const,
        emoji: '🌇',
        backgroundImage: '/ambient-themes/static/cozy-apartment-sunset-view.jpg',
        type: 'static' as const
      },
      {
        id: 'cozy-room-sunset',
        name: 'Cozy Room Sunset',
        gradient: 'from-amber-900 via-orange-900 to-red-900',
        primaryColor: 'amber',
        description: 'Student room with sunset',
        category: 'ambient' as const,
        emoji: '📚',
        backgroundImage: '/ambient-themes/static/cozy-room-with-sunset-student.jpg',
        type: 'static' as const
      },
      {
        id: 'thunderstorm-digital',
        name: 'Digital Thunderstorm',
        gradient: 'from-slate-900 via-gray-900 to-blue-900',
        primaryColor: 'slate',
        description: 'Digital art thunderstorm',
        category: 'ambient' as const,
        emoji: '⛈️',
        backgroundImage: '/ambient-themes/static/digital-art-style-illustration-thunderstorm.jpg',
        type: 'static' as const
      },
      {
        id: 'forest',
        name: 'Forest Path',
        gradient: 'from-green-900 via-emerald-900 to-teal-900',
        primaryColor: 'green',
        description: 'Mystical forest trail',
        category: 'ambient' as const,
        emoji: '🌲',
        backgroundImage: '/ambient-themes/static/Forest.jpg',
        type: 'static' as const
      },
      {
        id: 'ian-unsplash',
        name: 'Ocean Waves',
        gradient: 'from-blue-600 via-cyan-600 to-teal-600',
        primaryColor: 'blue',
        description: 'Calming ocean waves',
        category: 'ambient' as const,
        emoji: '🌊',
        backgroundImage: '/ambient-themes/static/ian-valerio-CAFq0pv9HjY-unsplash.jpg',
        type: 'static' as const
      },
      {
        id: 'kyle-unsplash',
        name: 'Mountain Lake',
        gradient: 'from-blue-800 via-indigo-800 to-purple-800',
        primaryColor: 'blue',
        description: 'Crystal clear mountain lake',
        category: 'ambient' as const,
        emoji: '🏔️',
        backgroundImage: '/ambient-themes/static/kyle-bushnell-Zi3Pt6lW1eo-unsplash.jpg',
        type: 'static' as const
      },
      {
        id: 'lofi-cafe',
        name: 'Lofi Cafe',
        gradient: 'from-purple-900 via-pink-900 to-indigo-900',
        primaryColor: 'purple',
        description: 'Cozy lofi cafe atmosphere',
        category: 'ambient' as const,
        emoji: '☕',
        backgroundImage: '/ambient-themes/static/LofiCafe.jpg',
        type: 'static' as const
      },
      {
        id: 'mark-unsplash',
        name: 'Forest Cabin',
        gradient: 'from-green-800 via-emerald-800 to-teal-800',
        primaryColor: 'green',
        description: 'Cabin in the woods',
        category: 'ambient' as const,
        emoji: '🏡',
        backgroundImage: '/ambient-themes/static/mark-basarab-1OtUkD_8svc-unsplash.jpg',
        type: 'static' as const
      },
      {
        id: 'matthew-unsplash',
        name: 'Mountain Peak',
        gradient: 'from-slate-800 via-gray-800 to-blue-800',
        primaryColor: 'slate',
        description: 'Majestic mountain peak',
        category: 'ambient' as const,
        emoji: '⛰️',
        backgroundImage: '/ambient-themes/static/matthew-smith-Rfflri94rs8-unsplash.jpg',
        type: 'static' as const
      },
      {
        id: 'rainy-night-city',
        name: 'Rainy Night City',
        gradient: 'from-blue-900 via-indigo-900 to-purple-900',
        primaryColor: 'blue',
        description: 'City view from cozy bedroom',
        category: 'ambient' as const,
        emoji: '🌧️',
        backgroundImage: '/ambient-themes/static/rainy-night-city-view-from-cozy-bedroom.jpg',
        type: 'static' as const
      },
      {
        id: 'thunderstorm-city',
        name: 'Thunderstorm City',
        gradient: 'from-slate-900 via-gray-900 to-blue-900',
        primaryColor: 'slate',
        description: 'Dramatic city thunderstorm',
        category: 'ambient' as const,
        emoji: '⛈️',
        backgroundImage: '/ambient-themes/static/thunderstorm-city.jpg',
        type: 'static' as const
      },
      {
        id: 'winter-cabin',
        name: 'Winter Cabin',
        gradient: 'from-blue-800 via-indigo-800 to-slate-800',
        primaryColor: 'blue',
        description: 'Cozy winter cabin',
        category: 'ambient' as const,
        emoji: '❄️',
        backgroundImage: '/ambient-themes/static/winterCabin.jpg',
        type: 'static' as const
      }
    ]
  }

  // Flatten all themes for easy access
  const themes: Theme[] = [
    ...themeCategories.liveBackground,
    ...themeCategories.colors,
    ...themeCategories.ambient
  ]

  // Lazy load image function with optimization and caching
  const lazyLoadImage = (src: string, width: number = 1920, quality: number = 85): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, src]))
        // Cache the loaded image info
        const cacheKey = `theme_image_${src}_${width}_${quality}`
        localStorage.setItem(cacheKey, 'loaded')
        resolve()
      }
      img.onerror = () => reject()
      
      // Add optimization parameters
      const url = new URL(src, window.location.origin)
      url.searchParams.set('w', width.toString())
      url.searchParams.set('q', quality.toString())
      url.searchParams.set('f', 'auto')
      
      img.src = url.toString()
    })
  }

  // Animation scripts are now loaded in index.html


  // Initialize Web Playback SDK

  // Initialize compatibility matrix
  useEffect(() => {
    const matrix = new Map<string, string[]>()
    
    // Weather themes - work well together
    matrix.set('rain', ['snow', 'thunderstorm'])
    matrix.set('snow', ['rain', 'thunderstorm'])
    matrix.set('thunderstorm', ['rain', 'snow'])
    
    // Space themes - cosmic combinations
    matrix.set('galaxy', ['aurora', 'particles', 'sparkles'])
    matrix.set('aurora', ['galaxy', 'particles', 'sparkles'])
    matrix.set('particles', ['galaxy', 'aurora', 'sparkles', 'geometric'])
    matrix.set('sparkles', ['galaxy', 'aurora', 'particles'])
    
    // Nature themes - natural combinations
    matrix.set('ocean', ['forest', 'sunset'])
    matrix.set('forest', ['ocean', 'sunset'])
    matrix.set('sunset', ['ocean', 'forest', 'clouds'])
    
    // Abstract themes - artistic combinations
    matrix.set('geometric', ['particles', 'sparkles', 'smoke'])
    matrix.set('smoke', ['geometric', 'fire'])
    matrix.set('fire', ['smoke', 'lava'])
    matrix.set('lava', ['fire', 'smoke'])
    
    // Digital themes - tech combinations
    matrix.set('matrix', ['neon', 'glitch', 'cyberpunk'])
    matrix.set('neon', ['matrix', 'glitch', 'cyberpunk'])
    matrix.set('glitch', ['matrix', 'neon', 'cyberpunk'])
    matrix.set('cyberpunk', ['matrix', 'neon', 'glitch'])
    
    // Video themes - only one video at a time, but can mix with compatible CSS animations
    matrix.set('video1', ['galaxy', 'aurora', 'particles'])
    matrix.set('video2', ['ocean', 'forest', 'sunset'])
    matrix.set('video3', ['forest', 'ocean', 'sunset'])
    matrix.set('video4', ['sunset', 'ocean', 'forest'])
    matrix.set('video5', ['neon', 'matrix', 'cyberpunk'])
    matrix.set('video6', ['geometric', 'particles', 'sparkles'])
    matrix.set('video7', ['sunset', 'fire', 'lava'])
    matrix.set('video8', ['cyberpunk', 'matrix', 'neon'])
    
    setCompatibilityMatrix(matrix)
  }, [])

  // Memoized theme mixing helper functions
  const isThemeCompatible = useMemo(() => 
    (themeId: string, existingThemes: string[]) => {
      if (!themeMixingEnabled || existingThemes.length === 0) return true
      
      // Check if any existing theme is compatible with the new one
      return existingThemes.some(existingTheme => {
        const compatibleThemes = compatibilityMatrix.get(existingTheme) || []
        return compatibleThemes.includes(themeId)
      })
    }, [themeMixingEnabled, compatibilityMatrix]
  )

  const getCompatibleThemes = useMemo(() => 
    (themeId: string) => compatibilityMatrix.get(themeId) || [],
    [compatibilityMatrix]
  )

  const resetToSingleTheme = () => {
    setActiveThemes([currentTheme])
    if (currentAnimation) {
      currentAnimation.destroy()
      setCurrentAnimation(null)
    }
    
    // Reset animation container background
    if (animationRef.current) {
      animationRef.current.style.backgroundColor = ''
      animationRef.current.style.background = ''
    }
  }

  const generateRandomCombination = () => {
    if (!themeMixingEnabled) return
    
    const liveBackgroundThemes = themeCategories.liveBackground
    const randomTheme = liveBackgroundThemes[Math.floor(Math.random() * liveBackgroundThemes.length)]
    const compatibleThemes = getCompatibleThemes(randomTheme.id)
    
    if (compatibleThemes.length > 0) {
      const additionalTheme = compatibleThemes[Math.floor(Math.random() * compatibleThemes.length)]
      const additionalThemeData = liveBackgroundThemes.find(t => t.id === additionalTheme)
      if (additionalThemeData) {
        setActiveThemes([randomTheme.id, additionalTheme])
        setCurrentTheme(randomTheme.id)
      }
    } else {
      setActiveThemes([randomTheme.id])
      setCurrentTheme(randomTheme.id)
    }
  }




  // Initialize animation with layering support
  const initializeAnimation = (animationType: string) => {
    if (currentAnimation) {
      currentAnimation.destroy()
    }

    if (animationRef.current && window.AnimatedBackground) {
      try {
        // For mixed themes, create a container for layered animations
        if (hasMixedThemes) {
          // Clear existing animation containers
          const existingContainers = animationRef.current.querySelectorAll('.animation-layer')
          existingContainers.forEach(container => container.remove())
          
          // Create layered animations for each active theme with animation
          activeThemesData
            .filter(theme => theme.animationType)
            .forEach((theme, index) => {
              const layerContainer = document.createElement('div')
              layerContainer.className = `animation-layer absolute inset-0 z-${index + 30}`
              layerContainer.style.opacity = `${0.8 - (index * 0.2)}`
              
              // Set dark background for weather animations
              if (['rain', 'snow', 'thunderstorm'].includes(theme.animationType!)) {
                layerContainer.style.backgroundColor = '#1a1a1a'
                layerContainer.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
              }
              
              animationRef.current?.appendChild(layerContainer)
              
              try {
                new window.AnimatedBackground(layerContainer, theme.animationType!)
              } catch (error) {
                console.warn(`Failed to initialize layered animation for ${theme.name}:`, error)
              }
            })
        } else {
          // Single animation - set dark background for weather effects
          if (['rain', 'snow', 'thunderstorm'].includes(animationType)) {
            animationRef.current.style.backgroundColor = '#1a1a1a'
            animationRef.current.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
          }
          
          const animation = new window.AnimatedBackground(animationRef.current, animationType)
          setCurrentAnimation(animation)
        }
      } catch (error) {
        console.warn('Failed to initialize animation:', error)
      }
    } else {
      // Wait a bit and try again if AnimatedBackground is not yet available
      setTimeout(() => {
        if (window.AnimatedBackground && animationRef.current) {
          try {
            if (hasMixedThemes) {
              // Handle mixed themes retry
              const existingContainers = animationRef.current.querySelectorAll('.animation-layer')
              existingContainers.forEach(container => container.remove())
              
              activeThemesData
                .filter(theme => theme.animationType)
                .forEach((theme, index) => {
                  const layerContainer = document.createElement('div')
                  layerContainer.className = `animation-layer absolute inset-0 z-${index + 30}`
                  layerContainer.style.opacity = `${0.8 - (index * 0.2)}`
                  
                  // Set dark background for weather animations
                  if (['rain', 'snow', 'thunderstorm'].includes(theme.animationType!)) {
                    layerContainer.style.backgroundColor = '#1a1a1a'
                    layerContainer.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                  }
                  
                  animationRef.current?.appendChild(layerContainer)
                  
                  try {
                    new window.AnimatedBackground(layerContainer, theme.animationType!)
                  } catch (error) {
                    console.warn(`Failed to initialize layered animation for ${theme.name}:`, error)
                  }
                })
            } else {
              // Single animation - set dark background for weather effects
              if (['rain', 'snow', 'thunderstorm'].includes(animationType)) {
                animationRef.current.style.backgroundColor = '#1a1a1a'
                animationRef.current.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
              }
              
              const animation = new window.AnimatedBackground(animationRef.current, animationType)
              setCurrentAnimation(animation)
            }
          } catch (error) {
            console.warn('Failed to initialize animation on retry:', error)
          }
        }
      }, 100)
    }
  }

  // Get optimized image URL for display
  const getOptimizedImageUrl = (src: string, width: number = 1920, quality: number = 85): string => {
    const url = new URL(src, window.location.origin)
    url.searchParams.set('w', width.toString())
    url.searchParams.set('q', quality.toString())
    url.searchParams.set('f', 'auto')
    return url.toString()
  }

  // Check if image is cached
  const isImageCached = (src: string, width: number, quality: number) => {
    const cacheKey = `theme_image_${src}_${width}_${quality}`
    return localStorage.getItem(cacheKey) === 'loaded'
  }

  // Lazy load images when they come into view or are selected
  const loadImageOnDemand = async (src: string, width: number = 200, quality: number = 80) => {
    if (loadedImages.has(src)) return // Already loaded
    
    // Check if image is cached
    if (isImageCached(src, width, quality)) {
      setLoadedImages(prev => new Set([...prev, src]))
      return
    }
    
    try {
      await lazyLoadImage(src, width, quality)
    } catch (error) {
      console.warn(`Failed to lazy load image: ${src}`)
    }
  }

  // Intersection Observer for lazy loading
  const useIntersectionObserver = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              callback()
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.1 }
      )

      if (ref.current) {
        observer.observe(ref.current)
      }

      return () => observer.disconnect()
    }, [callback])
  }

  // Initialize loading state and preload first few themes
  useEffect(() => {
    // Preload first 3 ambient themes for better UX
    const preloadFirstThemes = async () => {
      const firstThemes = themeCategories.ambient.slice(0, 3)
      const preloadPromises = firstThemes
        .filter(theme => theme.backgroundImage)
        .map(theme => lazyLoadImage(theme.backgroundImage!, 200, 80))
      
      try {
        await Promise.all(preloadPromises)
      } catch (error) {
        console.warn('Failed to preload first themes:', error)
      }
    }
    
    preloadFirstThemes()
    
    // Set initial loading to false after a short delay to show the UI
    const timer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 800)
    
    return () => clearTimeout(timer)
  }, [])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (currentAnimation) {
        currentAnimation.destroy()
      }
    }
  }, [currentAnimation])

  // Keyboard shortcuts
  const keyboardShortcuts = [
    { key: 'Space', action: 'Start/Pause timer' },
    { key: 'R', action: 'Reset timer' },
    { key: 'F', action: 'Focus mode' },
    { key: 'S', action: 'Short break' },
    { key: 'L', action: 'Long break' },
    { key: 'M', action: 'Mute/Unmute' },
    { key: 'Esc', action: 'Close modals' },
    { key: 'F11', action: 'Toggle fullscreen' }
  ]

  // Congratulatory messages
  const congratsMessages = [
    "Great session! Keep it up! 🎉",
    "Excellent focus! You're on fire! 🔥",
    "Amazing work! Stay consistent! ⭐",
    "Fantastic session! You're crushing it! 💪",
    "Outstanding focus! Keep the momentum! 🚀",
    "Brilliant work! You're unstoppable! ⚡",
    "Incredible session! Stay focused! 🎯",
    "Perfect timing! You're doing great! ✨",
    "Awesome work! Keep building that habit! 🌟",
    "Superb focus! You're getting stronger! 💎",
    "Excellent session! Stay motivated! 🎊",
    "Outstanding work! You're on a roll! 🌈",
    "Fantastic focus! Keep pushing forward! 🏆",
    "Amazing session! You're unstoppable! 🎭",
    "Brilliant work! Stay consistent! 🎨"
  ]

  // Break completion messages
  const breakMessages = [
    "Break time's up! Let's get back to crushing your goals! 💪",
    "Refreshed and ready? Time to focus and achieve! 🎯",
    "Break complete! Your goals are waiting for you! 🚀",
    "Recharged! Let's tackle your next challenge! ⚡",
    "Break's over! Time to make progress on your dreams! 🌟",
    "Ready to get back to work? Your future self will thank you! 🏆",
    "Break finished! Let's continue building your success! 💎",
    "Rejuvenated? Time to focus and dominate! 🔥",
    "Break complete! Your goals won't achieve themselves! 🎊",
    "Refreshed! Let's get back to making magic happen! ✨",
    "Break's done! Time to level up your productivity! 🎭",
    "Recharged! Your goals are calling - let's answer! 📞",
    "Break finished! Ready to make today count? 🌈",
    "Refreshed! Let's get back to building your empire! 👑",
    "Break complete! Time to focus and win! 🏅"
  ]

  // Initialize timer
  useEffect(() => {
    setTimeLeft(durations[mode] * 60)
  }, [mode, durations])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return // Don't trigger when typing in input
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          toggleTimer()
          break
        case 'r':
          resetTimer()
          break
        case 'f':
          changeMode('focus')
          break
        case 's':
          changeMode('shortBreak')
          break
        case 'l':
          changeMode('longBreak')
          break
        case 'm':
          setIsMuted(!isMuted)
          break
        case 'escape':
          setShowSettings(false)
          setShowCongrats(false)
          setShowBreakComplete(false)
          setShowThemes(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isMuted])

  // Request notification permission
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission()
    }
  }, [notificationsEnabled])

  // Load data from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('pomodoro-sessions')
    const savedSettings = localStorage.getItem('pomodoro-settings')
    const savedTheme = localStorage.getItem('pomodoro-theme')
    
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions))
    }
    
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setDurations(settings.durations || durations)
      setSelectedSound(settings.selectedSound || 'rain')
      setIsMuted(settings.isMuted || false)
      setNotificationsEnabled(settings.notificationsEnabled || true)
    }
    
    if (savedTheme) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro-sessions', JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    const settings = {
      durations,
      selectedSound,
      isMuted,
      notificationsEnabled,
    }
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings))
  }, [durations, selectedSound, isMuted, notificationsEnabled])

  useEffect(() => {
    localStorage.setItem('pomodoro-theme', currentTheme)
  }, [currentTheme])

  // Timer countdown
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1 && !isCompleting) {
            // Timer completed
            completeSession()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft])

  // Complete session
  const completeSession = () => {
    if (isCompleting) return // Prevent duplicate completion
    
    setIsCompleting(true)
    setIsRunning(false)
    
    // Only increment sessions completed for focus sessions
    if (mode === 'focus') {
      setSessionsCompleted(prev => prev + 1)
    }
    
    // Add to session history
    const newSession: Session = {
      id: Date.now().toString(),
      mode,
      duration: durations[mode],
      completedAt: new Date(),
      focusTitle: focusTitle || undefined,
      timestamp: new Date().toISOString()
    }
    setSessions(prev => [newSession, ...prev])
    
    // Play completion sound
    if (!isMuted) {
      playCompletionSound()
    }
    
    // Show notification
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const modeText = mode === 'focus' ? 'Focus session' : mode === 'shortBreak' ? 'Short break' : 'Long break'
      new Notification(`${modeText} completed! 🎉`, {
        body: mode === 'focus' ? 'Time for a break!' : 'Ready to focus again?',
        icon: '/favicon.svg',
        badge: '/favicon.svg'
      })
    }
    
    // Show congratulatory message
    if (mode === 'focus') {
      const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)]
      setCongratsMessage(randomMessage)
      setShowCongrats(true)
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setShowCongrats(false)
      }, 3000)
    } else if (mode === 'shortBreak' || mode === 'longBreak') {
      const randomBreakMessage = breakMessages[Math.floor(Math.random() * breakMessages.length)]
      setBreakMessage(randomBreakMessage)
      setShowBreakComplete(true)
      
      // Auto-hide after 4 seconds (slightly longer for break messages)
      setTimeout(() => {
        setShowBreakComplete(false)
      }, 4000)
    }
    
    // Auto-advance to next mode
    setTimeout(() => {
      if (mode === 'focus') {
        setMode(sessionsCompleted % 3 === 2 ? 'longBreak' : 'shortBreak')
      } else {
        setMode('focus')
      }
    }, 2000)
  }

  // Play completion sound
  const playCompletionSound = () => {
    if (isMuted) return
    
    // Find the selected completion sound
    const sound = completionSounds.find(s => s.id === selectedSound)
    if (!sound) {
      console.warn('Completion sound not found:', selectedSound)
      return
    }
    
    console.log('Playing completion sound:', sound.name)
    
    // Create Web Audio API context for completion sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    gainNode.gain.value = 0.5
    
    // Generate different completion sounds based on selection
    switch (selectedSound) {
      case 'bell':
        playBellSound(audioContext, gainNode)
        break
      case 'chime':
        playChimeSound(audioContext, gainNode)
        break
      case 'ding':
        playDingSound(audioContext, gainNode)
        break
      case 'pop':
        playPopSound(audioContext, gainNode)
        break
      case 'whoosh':
        playWhooshSound(audioContext, gainNode)
        break
      case 'tada':
        playTadaSound(audioContext, gainNode)
        break
      case 'success':
        playSuccessSound(audioContext, gainNode)
        break
      case 'notification':
        playNotificationSound(audioContext, gainNode)
        break
      case 'achievement':
        playAchievementSound(audioContext, gainNode)
        break
      case 'zen':
        playZenSound(audioContext, gainNode)
        break
      default:
        playBellSound(audioContext, gainNode) // Default to bell
    }
  }

  // Bell sound - rich harmonic bell with overtones
  const playBellSound = (ctx: AudioContext, gain: GainNode) => {
    const fundamental = 800
    const overtones = [1, 2.76, 5.4, 8.93, 13.34] // Bell harmonic series
    
    overtones.forEach((multiplier, index) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(gain)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(fundamental * multiplier, ctx.currentTime)
      
      const volume = 0.3 / (index + 1) // Decreasing volume for higher overtones
      noteGain.gain.setValueAtTime(volume, ctx.currentTime)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 2.0)
    })
  }

  // Chime sound - beautiful wind chime with reverb
  const playChimeSound = (ctx: AudioContext, gain: GainNode) => {
    const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51] // C, E, G, C, E
    const reverb = ctx.createConvolver()
    const reverbGain = ctx.createGain()
    
    // Create simple reverb impulse
    const length = ctx.sampleRate * 0.5
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }
    reverb.buffer = impulse
    
    gain.connect(reverbGain)
    reverbGain.connect(reverb)
    reverb.connect(ctx.destination)
    reverbGain.gain.value = 0.3
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(gain)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08)
      
      noteGain.gain.setValueAtTime(0.4, ctx.currentTime + index * 0.08)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 1.5)
      
      oscillator.start(ctx.currentTime + index * 0.08)
      oscillator.stop(ctx.currentTime + index * 0.08 + 1.5)
    })
  }

  // Ding sound - crisp notification with harmonics
  const playDingSound = (ctx: AudioContext, gain: GainNode) => {
    const fundamental = 1000
    const harmonics = [1, 2, 3, 4] // Add harmonics for richness
    
    harmonics.forEach((multiplier, index) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(gain)
      
      oscillator.type = 'triangle' // Softer than square wave
      oscillator.frequency.setValueAtTime(fundamental * multiplier, ctx.currentTime)
      
      const volume = 0.3 / (index + 1)
      noteGain.gain.setValueAtTime(volume, ctx.currentTime)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)
    })
  }

  // Pop sound - satisfying bubble pop with envelope
  const playPopSound = (ctx: AudioContext, gain: GainNode) => {
    const oscillator = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const envelope = ctx.createGain()
    
    oscillator.connect(filter)
    filter.connect(envelope)
    envelope.connect(gain)
    
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(300, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15)
    
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)
    filter.Q.setValueAtTime(1, ctx.currentTime)
    
    envelope.gain.setValueAtTime(0, ctx.currentTime)
    envelope.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  }

  // Whoosh sound - smooth air movement with filter sweep
  const playWhooshSound = (ctx: AudioContext, gain: GainNode) => {
    const oscillator = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const envelope = ctx.createGain()
    
    oscillator.connect(filter)
    filter.connect(envelope)
    envelope.connect(gain)
    
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(1500, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4)
    
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3000, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4)
    filter.Q.setValueAtTime(0.5, ctx.currentTime)
    
    envelope.gain.setValueAtTime(0, ctx.currentTime)
    envelope.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05)
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  }

  // Tada sound - triumphant fanfare with proper timing
  const playTadaSound = (ctx: AudioContext, gain: GainNode) => {
    const melody = [
      { freq: 523.25, time: 0, duration: 0.3 },    // C
      { freq: 659.25, time: 0.1, duration: 0.3 },  // E
      { freq: 783.99, time: 0.2, duration: 0.3 },  // G
      { freq: 1046.50, time: 0.3, duration: 0.4 }, // C
      { freq: 1318.51, time: 0.4, duration: 0.4 }, // E
      { freq: 1567.98, time: 0.5, duration: 0.5 }  // G
    ]
    
    melody.forEach((note) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(gain)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time)
      
      noteGain.gain.setValueAtTime(0, ctx.currentTime + note.time)
      noteGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + note.time + 0.05)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.duration)
      
      oscillator.start(ctx.currentTime + note.time)
      oscillator.stop(ctx.currentTime + note.time + note.duration)
    })
  }

  // Success sound - uplifting major chord progression
  const playSuccessSound = (ctx: AudioContext, gain: GainNode) => {
    const chord = [523.25, 659.25, 783.99, 1046.50] // C major chord
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, ctx.currentTime)
    filter.Q.setValueAtTime(1, ctx.currentTime)
    
    chord.forEach((freq, index) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(filter)
      filter.connect(gain)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1)
      
      noteGain.gain.setValueAtTime(0, ctx.currentTime + index * 0.1)
      noteGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + index * 0.1 + 0.1)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 1.0)
      
      oscillator.start(ctx.currentTime + index * 0.1)
      oscillator.stop(ctx.currentTime + index * 0.1 + 1.0)
    })
  }

  // Notification sound - modern app-style notification
  const playNotificationSound = (ctx: AudioContext, gain: GainNode) => {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1500, ctx.currentTime)
    filter.Q.setValueAtTime(0.5, ctx.currentTime)
    
    // Two-tone notification
    const tones = [
      { freq: 800, time: 0, duration: 0.15 },
      { freq: 1000, time: 0.2, duration: 0.15 }
    ]
    
    tones.forEach((tone) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(filter)
      filter.connect(gain)
      
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(tone.freq, ctx.currentTime + tone.time)
      
      noteGain.gain.setValueAtTime(0, ctx.currentTime + tone.time)
      noteGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + tone.time + 0.02)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tone.time + tone.duration)
      
      oscillator.start(ctx.currentTime + tone.time)
      oscillator.stop(ctx.currentTime + tone.time + tone.duration)
    })
  }

  // Achievement sound - celebratory ascending arpeggio
  const playAchievementSound = (ctx: AudioContext, gain: GainNode) => {
    const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98] // C major arpeggio
    const reverb = ctx.createConvolver()
    const reverbGain = ctx.createGain()
    
    // Create reverb impulse
    const length = ctx.sampleRate * 0.3
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5)
      }
    }
    reverb.buffer = impulse
    
    gain.connect(reverbGain)
    reverbGain.connect(reverb)
    reverb.connect(ctx.destination)
    reverbGain.gain.value = 0.2
    
    arpeggio.forEach((freq, index) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(gain)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08)
      
      noteGain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08)
      noteGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + index * 0.08 + 0.05)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.8)
      
      oscillator.start(ctx.currentTime + index * 0.08)
      oscillator.stop(ctx.currentTime + index * 0.08 + 0.8)
    })
  }

  // Zen sound - peaceful meditation bell
  const playZenSound = (ctx: AudioContext, gain: GainNode) => {
    const fundamental = 220 // Low A
    const overtones = [1, 2.76, 5.4, 8.93] // Bell harmonics
    
    overtones.forEach((multiplier, index) => {
      const oscillator = ctx.createOscillator()
      const noteGain = ctx.createGain()
      
      oscillator.connect(noteGain)
      noteGain.connect(gain)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(fundamental * multiplier, ctx.currentTime)
      
      const volume = 0.4 / (index + 1)
      noteGain.gain.setValueAtTime(volume, ctx.currentTime)
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 3.0)
    })
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start/pause timer
  const toggleTimer = () => {
    if (!isRunning) {
      setIsCompleting(false) // Reset completion flag when starting
    }
    setIsRunning(!isRunning)
  }

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(durations[mode] * 60)
    setIsCompleting(false)
  }

  // Change mode
  const changeMode = (newMode: TimerMode) => {
    setMode(newMode)
    setIsRunning(false)
    setIsCompleting(false)
  }

  // Calculate progress percentage
  const progress = ((durations[mode] * 60 - timeLeft) / (durations[mode] * 60)) * 100

  // Memoized theme data for performance
  const currentThemeData = useMemo(() => 
    themes.find(t => t.id === currentTheme) || themes[0], 
    [currentTheme, themes]
  )
  
  const activeThemesData = useMemo(() => 
    activeThemes.map(themeId => themes.find(t => t.id === themeId)).filter(Boolean) as Theme[],
    [activeThemes, themes]
  )
  
  // Check if current theme has background image, animation, or video
  const hasBackgroundImage = currentThemeData?.backgroundImage && currentThemeData?.category === 'ambient'
  const hasAnimation = currentThemeData?.animationType && currentThemeData?.category === 'liveBackground'
  const hasVideoBackground = currentThemeData?.videoBackground && currentThemeData?.category === 'liveBackground'
  
  // Check for mixed themes
  const hasMixedThemes = themeMixingEnabled && activeThemes.length > 1



  // Export data
  const exportData = () => {
    const data = {
      sessions,
      settings: {
        durations,
        selectedSound,
        isMuted,
        notificationsEnabled,
        currentTheme
      },
      stats: {
        totalSessions: sessions.length,
        totalFocusTime: sessions.reduce((acc, s) => acc + s.duration, 0)
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pomodoro-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleBack = () => {
    // This is a standalone app, no navigation needed
    console.log('Back button clicked')
  }

  const handleGoToDevRoadmap = () => {
    // This is a standalone app, no navigation needed
    console.log('Dev Roadmap button clicked')
  }

  const handleGoToFocusHome = () => {
    // This is a standalone app, no navigation needed
    console.log('Focus Home button clicked')
  }


  // Reusable Theme Selection Handler with Lazy Loading and Mixing Support
  const handleThemeSelection = async (theme: Theme) => {
    if ('backgroundImage' in theme && theme.backgroundImage && !loadedImages.has(theme.backgroundImage)) {
      setIsImageLoading(true)
      try {
        await lazyLoadImage(theme.backgroundImage!, 1920, 85) // Load full resolution for background
      } catch (error) {
        console.warn(`Failed to lazy load image: ${theme.backgroundImage}`)
      } finally {
        setIsImageLoading(false)
      }
    }
    
    if (themeMixingEnabled && theme.category === 'liveBackground') {
      // Check compatibility before adding to active themes
      if (isThemeCompatible(theme.id, activeThemes)) {
        if (activeThemes.includes(theme.id)) {
          // Remove if already active
          const newActiveThemes = activeThemes.filter(id => id !== theme.id)
          setActiveThemes(newActiveThemes)
          // Update currentTheme to the first remaining theme or the theme being removed
          if (newActiveThemes.length > 0) {
            setCurrentTheme(newActiveThemes[0])
          } else {
            setCurrentTheme(theme.id) // Keep the removed theme as current
          }
        } else {
          // Add to active themes
          const newActiveThemes = [...activeThemes, theme.id]
          setActiveThemes(newActiveThemes)
          setCurrentTheme(theme.id) // Set as current theme
        }
      } else {
        // Replace incompatible themes
        setActiveThemes([theme.id])
        setCurrentTheme(theme.id)
      }
    } else {
      // Single theme mode
      setActiveThemes([theme.id])
      setCurrentTheme(theme.id)
    }
    
    // Clean up existing animation if switching away from animation theme
    if (currentAnimation && !('animationType' in theme && theme.animationType)) {
      currentAnimation.destroy()
      setCurrentAnimation(null)
      
      // Reset background for weather animations
      if (animationRef.current) {
        animationRef.current.style.backgroundColor = ''
        animationRef.current.style.background = ''
      }
    }
    
    if ('animationType' in theme && theme.animationType) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        initializeAnimation(theme.animationType!)
      }, 100)
    }
  }

  // Reusable Theme Preview Component with Lazy Loading and Compatibility Indicators
  const ThemePreview = ({ theme, isSelected, onClick }: { 
    theme: Theme, 
    isSelected: boolean, 
    onClick: () => void 
  }) => {
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)
    
    const isActive = activeThemes.includes(theme.id)
    const isCompatible = isThemeCompatible(theme.id, activeThemes)
    
    // Lazy load preview image when it comes into view
    const loadPreviewImage = () => {
      if ('backgroundImage' in theme && theme.backgroundImage && !loadedImages.has(theme.backgroundImage)) {
        setIsPreviewLoading(true)
        loadImageOnDemand(theme.backgroundImage, 200, 80).finally(() => {
          setIsPreviewLoading(false)
        })
      }
    }
    
    useIntersectionObserver(previewRef, loadPreviewImage)
    
    return (
      <button
        onClick={onClick}
        className={`p-4 rounded-xl transition-all relative ${
          isActive
            ? 'bg-white/40 border-2 border-white/70'
            : isSelected
            ? 'bg-white/30 border-2 border-white/50'
            : !isCompatible && themeMixingEnabled && activeThemes.length > 0
            ? 'bg-red-500/20 border-2 border-red-500/50'
            : 'bg-white/10 border border-white/20 hover:bg-white/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{theme.emoji}</span>
          <div className="text-white font-medium text-sm">{theme.name}</div>
          {isActive && (
            <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          )}
          {!isCompatible && themeMixingEnabled && activeThemes.length > 0 && (
            <div className="ml-auto w-2 h-2 bg-red-400 rounded-full"></div>
          )}
        </div>
        <div 
          ref={previewRef}
          className={`w-full h-12 rounded-lg mb-2 relative ${
            'backgroundImage' in theme && theme.backgroundImage 
              ? 'bg-cover bg-center bg-no-repeat' 
              : 'animationType' in theme && theme.animationType
              ? 'bg-gradient-to-br from-gray-800 to-gray-600'
              : 'videoBackground' in theme && theme.videoBackground
              ? 'bg-gradient-to-br from-gray-800 to-gray-600'
              : `bg-gradient-to-br ${theme.gradient}`
          }`}
          style={'backgroundImage' in theme && theme.backgroundImage && loadedImages.has(theme.backgroundImage) ? { backgroundImage: `url(${getOptimizedImageUrl(theme.backgroundImage, 200, 80)})` } : {}}
        >
          {/* Animation preview */}
          {'animationType' in theme && theme.animationType && (
            <div className="absolute inset-0 rounded-lg overflow-hidden">
              <div className={`w-full h-full ${theme.animationType}-background`}></div>
            </div>
          )}
          
          {/* Video preview */}
          {'videoBackground' in theme && theme.videoBackground && (
            <div className="absolute inset-0 rounded-lg overflow-hidden">
              <video
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              >
                <source src={theme.videoBackground} type="video/mp4" />
              </video>
            </div>
          )}
          
          {/* Loading placeholder for ambient themes */}
          {'backgroundImage' in theme && theme.backgroundImage && (isPreviewLoading || !loadedImages.has(theme.backgroundImage)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-600 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <div className="text-xs text-white/60">Loading...</div>
              </div>
            </div>
          )}
        </div>
        <div className="text-white/60 text-xs">{theme.description}</div>
      </button>
    )
  }

  return (
    <>
      <div 
      ref={animationRef}
      className={`min-h-screen flex flex-col relative overflow-hidden transition-all duration-1000 ${
        projectorMode && isFullscreen
          ? 'bg-black' // High contrast black background for projector mode
          : hasMixedThemes
          ? '' // Mixed themes handle their own backgrounds
          : hasBackgroundImage 
          ? 'bg-cover bg-center bg-no-repeat' 
          : hasAnimation
          ? ''
          : hasVideoBackground
          ? ''
          : `bg-gradient-to-br ${currentThemeData.gradient}`
      }`}
      style={{
        ...(hasBackgroundImage && !hasMixedThemes ? { backgroundImage: `url(${getOptimizedImageUrl(currentThemeData.backgroundImage!)})` } : {}),
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      {/* Single Theme Video Background */}
      {hasVideoBackground && !hasMixedThemes && (
        <video
          key={currentTheme} // Force re-mount when theme changes
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={currentThemeData.videoBackground} type="video/mp4" />
        </video>
      )}
      
      {/* Mixed Themes Rendering */}
      {hasMixedThemes && (
        <>
          {/* Render gradient backgrounds for mixed themes */}
          {activeThemesData.map((theme, index) => (
            <div
              key={`gradient-${theme.id}-${index}`}
              className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-${Math.max(20, 100 - (index * 20))} z-${index}`}
            />
          ))}
          
          {/* Render video backgrounds for mixed themes */}
          {activeThemesData
            .filter(theme => theme.videoBackground)
            .map((theme, index) => (
              <video
                key={`video-${theme.id}-${index}`}
                className={`absolute inset-0 w-full h-full object-cover z-${index + 10}`}
                autoPlay
                loop
                muted
                playsInline
                style={{ opacity: 0.7 - (index * 0.2) }}
              >
                <source src={theme.videoBackground} type="video/mp4" />
              </video>
            ))}
          
          {/* Render image backgrounds for mixed themes */}
          {activeThemesData
            .filter(theme => theme.backgroundImage)
            .map((theme, index) => (
              <div
                key={`image-${theme.id}-${index}`}
                className={`absolute inset-0 bg-cover bg-center bg-no-repeat z-${index + 20}`}
                style={{ 
                  backgroundImage: `url(${getOptimizedImageUrl(theme.backgroundImage!)})`,
                  opacity: 0.6 - (index * 0.1)
                }}
              />
            ))}
        </>
      )}
      
      {/* Background overlays */}
      {hasMixedThemes ? (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px] z-50"></div>
      ) : (
        <>
          {/* Background overlay for ambient themes */}
          {hasBackgroundImage && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]"></div>
          )}
          
          {/* Background overlay for animations */}
          {hasAnimation && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px]"></div>
          )}
          
          {/* Background overlay for video backgrounds */}
          {hasVideoBackground && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px]"></div>
          )}
        </>
      )}
      
      {/* Loading overlay for image loading */}
      {isImageLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg font-medium">Loading theme...</div>
            <div className="text-sm text-white/70 mt-2">Optimizing image for best quality</div>
          </div>
        </div>
      )}
      

      {/* Initial loading overlay */}
      {isInitialLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-white text-center max-w-sm mx-auto px-6">
            <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-xl font-medium mb-4">Loading Focus Timer...</div>
            <div className="text-sm text-white/70">Preparing your productivity environment</div>
          </div>
        </div>
      )}
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Weather Effects */}
      {weatherEffect === 'rain' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <div className="rain-container">
            {Array.from({ length: 100 }, (_, i) => (
              <div
                key={i}
                className="rain-drop"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {weatherEffect === 'snow' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <div className="snow-container">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="snowflake"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                ❄
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header - Hidden in fullscreen mode */}
      {!isFullscreen && (
        <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-white font-bold text-2xl">BME</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTimer}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isRunning ? 'Pause Timer' : 'Start Timer'}
              >
                {isRunning ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              
              <button
                onClick={resetTimer}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Reset Timer"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Title - Only visible in fullscreen mode */}
      {isFullscreen && focusTitle && (
        <div className="absolute top-6 left-6 z-20" style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
          <span className={`text-white/90 font-medium ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>{focusTitle}</span>
        </div>
      )}

      {/* Fullscreen Controls - Only visible in fullscreen mode */}
      {isFullscreen && (
        <div className={`absolute top-6 right-6 z-20 flex items-center ${projectorMode ? 'gap-4' : 'gap-3'}`} style={{ top: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
          <button
            onClick={toggleTimer}
            className={`${projectorMode ? 'p-6' : 'p-4'} text-white hover:text-white hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-md bg-black/40 border border-white/20 shadow-lg hover:shadow-xl hover:scale-105`}
            title={isRunning ? 'Pause Timer' : 'Start Timer'}
          >
            {isRunning ? (
              <Pause className={`${projectorMode ? 'w-10 h-10' : 'w-7 h-7'}`} />
            ) : (
              <Play className={`${projectorMode ? 'w-10 h-10' : 'w-7 h-7'}`} />
            )}
          </button>
          
          <button
            onClick={resetTimer}
            className={`${projectorMode ? 'p-6' : 'p-4'} text-white hover:text-white hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-md bg-black/40 border border-white/20 shadow-lg hover:shadow-xl hover:scale-105`}
            title="Reset Timer"
          >
            <RefreshCw className={`${projectorMode ? 'w-10 h-10' : 'w-7 h-7'}`} />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className={`${projectorMode ? 'p-6' : 'p-4'} text-white hover:text-white hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-md bg-black/40 border border-white/20 shadow-lg hover:shadow-xl hover:scale-105`}
            title="Exit Fullscreen"
          >
            <Minimize2 className={`${projectorMode ? 'w-10 h-10' : 'w-7 h-7'}`} />
          </button>
        </div>
      )}

      {/* Fullscreen Mode Indicator */}
      {isFullscreen && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-white/80 text-sm">
            Fullscreen Mode • Tap controls to manage timer
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isFullscreen ? 'h-screen' : 'flex-1'} flex items-center justify-center ${isFullscreen ? 'p-4' : 'p-8'} relative z-10`}>
        <div className="w-full max-w-2xl">
          {/* Focus Title Input - Hidden in fullscreen mode */}
          {!isFullscreen && (
            <div className="mb-8 text-center">
              <input
                type="text"
                value={focusTitle}
                onChange={(e) => setFocusTitle(e.target.value)}
                placeholder="What do you want to focus on?"
                className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-4 text-white placeholder-white/60 text-center text-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
              />
            </div>
          )}

          {/* Timer Modes - Hidden in fullscreen mode */}
          {!isFullscreen && (
            <div className="flex justify-center gap-4 mb-8">
              {Object.entries(timerModes).map(([modeKey, config]) => {
                const Icon = config.icon
                const isActive = mode === modeKey
                return (
                  <button
                    key={modeKey}
                    onClick={() => changeMode(modeKey as TimerMode)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                      isActive 
                        ? `${config.bgColor} border-2 border-white/30 text-white` 
                        : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{config.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Main Timer Display */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              {/* Circular Progress - Only show for designs that need it */}
              {timerDesigns.find(d => d.id === selectedTimerDesign)?.hasCircle && (
                <div className="w-80 h-80 mx-auto relative">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="url(#gradient)"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      className="transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
                
                {/* Timer Display */}
                <div className={`${timerDesigns.find(d => d.id === selectedTimerDesign)?.hasCircle ? 'absolute inset-0' : 'relative'} flex flex-col items-center justify-center`}>
                  <div 
                    className={`font-mono font-bold mb-2 timer-display timer-${selectedTimerDesign} ${isFullscreen && projectorMode ? 'scale-150' : isFullscreen ? 'scale-125' : ''} ${
                      selectedTimerDesign === 'massive' ? 'text-9xl' :
                      selectedTimerDesign === 'split-screen' ? 'text-8xl' :
                      selectedTimerDesign === 'floating' ? 'text-7xl' :
                      selectedTimerDesign === 'typewriter' ? 'text-5xl' :
                      selectedTimerDesign === 'led-display' ? 'text-8xl' :
                      selectedTimerDesign === 'neon-sign' ? 'text-7xl' :
                      selectedTimerDesign === 'hologram' ? 'text-8xl' :
                      selectedTimerDesign === 'water-drop' ? 'text-6xl' :
                      selectedTimerDesign === 'smoke' ? 'text-7xl' :
                      selectedTimerDesign === 'glitch' ? 'text-6xl' :
                      selectedTimerDesign === 'mosaic' ? 'text-5xl' :
                      selectedTimerDesign === 'origami' ? 'text-6xl' :
                      selectedTimerDesign === 'chalkboard' ? 'text-6xl' :
                      selectedTimerDesign === 'neon-tube' ? 'text-7xl' :
                      selectedTimerDesign === 'crystal-grow' ? 'text-6xl' :
                      selectedTimerDesign === 'magnetic' ? 'text-7xl' :
                      selectedTimerDesign === 'liquid-metal' ? 'text-6xl' :
                      selectedTimerDesign === 'energy-field' ? 'text-7xl' :
                      selectedTimerDesign === 'quantum' ? 'text-8xl' :
                      selectedTimerDesign === 'time-vortex' ? 'text-9xl' :
                      selectedTimerDesign === 'giant' ? 'text-9xl' :
                      selectedTimerDesign === 'cyberpunk' ? 'text-8xl' :
                      selectedTimerDesign === 'matrix-code' ? 'text-7xl' :
                      selectedTimerDesign === 'laser' ? 'text-8xl' :
                      selectedTimerDesign === 'plasma' ? 'text-7xl' :
                      selectedTimerDesign === 'void' ? 'text-8xl' :
                      'text-6xl'
                    }`}
                    style={{
                      color: selectedTimerDesign === 'neon' ? '#00ffff' : 
                             selectedTimerDesign === 'fire' ? '#ff4500' :
                             selectedTimerDesign === 'gold' ? '#ffd700' :
                             selectedTimerDesign === 'rainbow' ? 'transparent' :
                             selectedTimerDesign === 'transparent' ? 'transparent' :
                             selectedTimerDesign === 'retro' ? '#ff0080' :
                             selectedTimerDesign === 'cyber' ? '#00ff00' :
                             selectedTimerDesign === 'neon-pink' ? '#ff1493' :
                             selectedTimerDesign === 'monochrome' ? '#000000' :
                             selectedTimerDesign === 'ice' ? '#b0e0e6' :
                             selectedTimerDesign === 'ocean' ? '#006994' :
                             selectedTimerDesign === 'nature' ? '#2d5016' :
                             selectedTimerDesign === 'space' ? '#ffffff' :
                             selectedTimerDesign === 'sunset' ? '#ff6347' :
                             selectedTimerDesign === 'midnight' ? '#191970' :
                             selectedTimerDesign === 'wood' ? '#8b4513' :
                             selectedTimerDesign === 'marble' ? '#ffffff' :
                             selectedTimerDesign === 'crystal' ? '#ffffff' :
                             selectedTimerDesign === 'silver' ? '#c0c0c0' :
                             selectedTimerDesign === 'glassmorphism' ? '#ffffff' :
                             selectedTimerDesign === 'holographic' ? 'transparent' :
                             selectedTimerDesign === 'aurora' ? 'transparent' :
                             selectedTimerDesign === 'gradient' ? 'transparent' :
                             selectedTimerDesign === 'minimalist' ? '#ffffff' :
                             selectedTimerDesign === 'vintage' ? '#8b4513' :
                             selectedTimerDesign === 'cosmic' ? '#ffffff' :
                             selectedTimerDesign === 'forest' ? '#2d5016' :
                             selectedTimerDesign === 'sunrise' ? '#ff8c00' :
                             selectedTimerDesign === 'moonlight' ? '#c0c0c0' :
                             selectedTimerDesign === 'coral' ? '#ff7f50' :
                             selectedTimerDesign === 'lavender' ? '#e6e6fa' :
                             selectedTimerDesign === 'emerald' ? '#50c878' :
                             selectedTimerDesign === 'sapphire' ? '#0f52ba' :
                             selectedTimerDesign === 'ruby' ? '#e0115f' :
                             selectedTimerDesign === 'diamond' ? '#ffffff' :
                             selectedTimerDesign === 'copper' ? '#b87333' :
                             selectedTimerDesign === 'steel' ? '#71797e' :
                             selectedTimerDesign === 'rose-gold' ? '#e8b4b8' :
                             selectedTimerDesign === 'platinum' ? '#e5e4e2' :
                             selectedTimerDesign === 'bronze' ? '#cd7f32' :
                             selectedTimerDesign === 'titanium' ? '#878681' :
                             selectedTimerDesign === 'pearl' ? '#f8f6f0' :
                             selectedTimerDesign === 'opal' ? 'transparent' :
                             selectedTimerDesign === 'amethyst' ? '#9966cc' :
                             selectedTimerDesign === 'citrine' ? '#e4d00a' :
                             selectedTimerDesign === 'aquamarine' ? '#7fffd4' :
                             selectedTimerDesign === 'topaz' ? '#ffc87c' :
                             selectedTimerDesign === 'massive' ? '#ffffff' :
                             selectedTimerDesign === 'split-screen' ? '#00ff00' :
                             selectedTimerDesign === 'floating' ? '#ffffff' :
                             selectedTimerDesign === 'typewriter' ? '#000000' :
                             selectedTimerDesign === 'led-display' ? '#00ff00' :
                             selectedTimerDesign === 'neon-sign' ? '#ff00ff' :
                             selectedTimerDesign === 'hologram' ? 'transparent' :
                             selectedTimerDesign === 'water-drop' ? '#00bfff' :
                             selectedTimerDesign === 'smoke' ? '#ffffff' :
                             selectedTimerDesign === 'glitch' ? '#ff0000' :
                             selectedTimerDesign === 'mosaic' ? '#ffffff' :
                             selectedTimerDesign === 'origami' ? '#ff6b6b' :
                             selectedTimerDesign === 'chalkboard' ? '#ffffff' :
                             selectedTimerDesign === 'neon-tube' ? '#00ffff' :
                             selectedTimerDesign === 'crystal-grow' ? '#ffffff' :
                             selectedTimerDesign === 'magnetic' ? '#ff00ff' :
                             selectedTimerDesign === 'liquid-metal' ? '#c0c0c0' :
                             selectedTimerDesign === 'energy-field' ? '#ffff00' :
                             selectedTimerDesign === 'quantum' ? '#00ff00' :
                             selectedTimerDesign === 'time-vortex' ? '#ffffff' :
                             selectedTimerDesign === 'giant' ? '#ffffff' :
                             selectedTimerDesign === 'cyberpunk' ? '#ff00ff' :
                             selectedTimerDesign === 'matrix-code' ? '#00ff00' :
                             selectedTimerDesign === 'laser' ? '#ff0000' :
                             selectedTimerDesign === 'plasma' ? '#ffff00' :
                             selectedTimerDesign === 'void' ? '#ffffff' :
                             selectedTimerDesign === 'default' ? 'white' : 'white',
                      textShadow: selectedTimerDesign === 'neon' ? '0 0 10px #00ffff, 0 0 20px #00ffff' :
                                  selectedTimerDesign === 'fire' ? '0 0 10px #ff4500, 0 0 20px #ff6500' :
                                  selectedTimerDesign === 'gold' ? '0 0 10px #ffd700' :
                                  selectedTimerDesign === 'retro' ? '2px 2px 0px #00ff00, 4px 4px 0px #0000ff' :
                                  selectedTimerDesign === 'cyber' ? '0 0 10px #00ff00' :
                                  selectedTimerDesign === 'neon-pink' ? '0 0 10px #ff1493' :
                                  selectedTimerDesign === 'ice' ? '0 0 10px #b0e0e6' :
                                  selectedTimerDesign === 'ocean' ? '0 0 10px #006994' :
                                  selectedTimerDesign === 'nature' ? '0 0 10px #2d5016' :
                                  selectedTimerDesign === 'space' ? '0 0 20px #667eea' :
                                  selectedTimerDesign === 'sunset' ? '0 0 10px #ff6347' :
                                  selectedTimerDesign === 'midnight' ? '0 0 15px #191970' :
                                  selectedTimerDesign === 'wood' ? '0 0 10px #8b4513' :
                                  selectedTimerDesign === 'marble' ? '0 0 10px #ffffff' :
                                  selectedTimerDesign === 'crystal' ? '0 0 20px #ffffff' :
                                  selectedTimerDesign === 'silver' ? '0 0 10px #c0c0c0' :
                                  selectedTimerDesign === 'glassmorphism' ? '0 0 10px #ffffff' :
                                  selectedTimerDesign === 'minimalist' ? 'none' :
                                  selectedTimerDesign === 'vintage' ? '2px 2px 4px rgba(0, 0, 0, 0.5)' :
                                  selectedTimerDesign === 'cosmic' ? '0 0 20px #ffffff, 0 0 40px #4a90e2' :
                                  selectedTimerDesign === 'forest' ? '0 0 10px #2d5016' :
                                  selectedTimerDesign === 'sunrise' ? '0 0 15px #ff8c00' :
                                  selectedTimerDesign === 'moonlight' ? '0 0 15px #c0c0c0' :
                                  selectedTimerDesign === 'coral' ? '0 0 10px #ff7f50' :
                                  selectedTimerDesign === 'lavender' ? '0 0 10px #e6e6fa' :
                                  selectedTimerDesign === 'emerald' ? '0 0 15px #50c878' :
                                  selectedTimerDesign === 'sapphire' ? '0 0 15px #0f52ba' :
                                  selectedTimerDesign === 'ruby' ? '0 0 15px #e0115f' :
                                  selectedTimerDesign === 'diamond' ? '0 0 20px #ffffff, 0 0 40px #ffffff' :
                                  selectedTimerDesign === 'copper' ? '0 0 10px #b87333' :
                                  selectedTimerDesign === 'steel' ? '0 0 5px #71797e' :
                                  selectedTimerDesign === 'rose-gold' ? '0 0 10px #e8b4b8' :
                                  selectedTimerDesign === 'platinum' ? '0 0 10px #e5e4e2' :
                                  selectedTimerDesign === 'bronze' ? '0 0 10px #cd7f32' :
                                  selectedTimerDesign === 'titanium' ? '0 0 5px #878681' :
                                  selectedTimerDesign === 'pearl' ? '0 0 15px #f8f6f0' :
                                  selectedTimerDesign === 'amethyst' ? '0 0 15px #9966cc' :
                                  selectedTimerDesign === 'citrine' ? '0 0 15px #e4d00a' :
                                  selectedTimerDesign === 'aquamarine' ? '0 0 15px #7fffd4' :
                                  selectedTimerDesign === 'topaz' ? '0 0 15px #ffc87c' :
                                  selectedTimerDesign === 'massive' ? '0 0 30px #ffffff, 0 0 60px #ffffff' :
                                  selectedTimerDesign === 'split-screen' ? '0 0 20px #00ff00, 0 0 40px #00ff00' :
                                  selectedTimerDesign === 'floating' ? '0 0 20px #ffffff, 0 0 40px #4a90e2' :
                                  selectedTimerDesign === 'typewriter' ? '2px 2px 0px #333333' :
                                  selectedTimerDesign === 'led-display' ? '0 0 10px #00ff00, 0 0 20px #00ff00' :
                                  selectedTimerDesign === 'neon-sign' ? '0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 60px #ff00ff' :
                                  selectedTimerDesign === 'hologram' ? '0 0 20px #00ffff, 0 0 40px #ff00ff, 0 0 60px #00ff00' :
                                  selectedTimerDesign === 'water-drop' ? '0 0 15px #00bfff, 0 0 30px #00bfff' :
                                  selectedTimerDesign === 'smoke' ? '0 0 20px #ffffff, 0 0 40px #cccccc' :
                                  selectedTimerDesign === 'glitch' ? '2px 0 0 #ff0000, -2px 0 0 #00ffff' :
                                  selectedTimerDesign === 'mosaic' ? '0 0 10px #ffffff' :
                                  selectedTimerDesign === 'origami' ? '0 0 15px #ff6b6b' :
                                  selectedTimerDesign === 'chalkboard' ? '0 0 10px #ffffff' :
                                  selectedTimerDesign === 'neon-tube' ? '0 0 20px #00ffff, 0 0 40px #00ffff' :
                                  selectedTimerDesign === 'crystal-grow' ? '0 0 20px #ffffff, 0 0 40px #ffffff' :
                                  selectedTimerDesign === 'magnetic' ? '0 0 20px #ff00ff, 0 0 40px #ff00ff' :
                                  selectedTimerDesign === 'liquid-metal' ? '0 0 15px #c0c0c0' :
                                  selectedTimerDesign === 'energy-field' ? '0 0 20px #ffff00, 0 0 40px #ffff00' :
                                  selectedTimerDesign === 'quantum' ? '0 0 20px #00ff00, 0 0 40px #00ff00' :
                                  selectedTimerDesign === 'time-vortex' ? '0 0 30px #ffffff, 0 0 60px #ffffff' :
                                  selectedTimerDesign === 'giant' ? '0 0 40px #ffffff, 0 0 80px #ffffff' :
                                  selectedTimerDesign === 'cyberpunk' ? '0 0 25px #ff00ff, 0 0 50px #ff00ff, 0 0 75px #ff00ff' :
                                  selectedTimerDesign === 'matrix-code' ? '0 0 20px #00ff00, 0 0 40px #00ff00' :
                                  selectedTimerDesign === 'laser' ? '0 0 25px #ff0000, 0 0 50px #ff0000' :
                                  selectedTimerDesign === 'plasma' ? '0 0 30px #ffff00, 0 0 60px #ffff00' :
                                  selectedTimerDesign === 'void' ? '0 0 20px #ffffff, 0 0 40px #000000' :
                                  selectedTimerDesign === 'default' ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                      backgroundImage: selectedTimerDesign === 'transparent' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.3))' :
                                     selectedTimerDesign === 'rainbow' ? 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' :
                                     selectedTimerDesign === 'gradient' ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)' :
                                     selectedTimerDesign === 'gold' ? 'linear-gradient(135deg, #ffd700, #ffed4e, #ffd700)' :
                                     selectedTimerDesign === 'holographic' ? 'linear-gradient(45deg, #ff006e, #8338ec, #3a86ff, #06ffa5, #ffbe0b)' :
                                     selectedTimerDesign === 'aurora' ? 'linear-gradient(45deg, #00ff88, #00d4ff, #ff00ff, #ff8800)' :
                                     selectedTimerDesign === 'cosmic' ? 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' :
                                     selectedTimerDesign === 'forest' ? 'linear-gradient(135deg, #2d5016, #3d6b1a, #4a7c59)' :
                                     selectedTimerDesign === 'sunrise' ? 'linear-gradient(135deg, #ff8c00, #ffa500, #ffd700)' :
                                     selectedTimerDesign === 'moonlight' ? 'linear-gradient(135deg, #c0c0c0, #e6e6fa, #f0f8ff)' :
                                     selectedTimerDesign === 'coral' ? 'linear-gradient(135deg, #ff7f50, #ff6347, #ff4500)' :
                                     selectedTimerDesign === 'lavender' ? 'linear-gradient(135deg, #e6e6fa, #dda0dd, #d8bfd8)' :
                                     selectedTimerDesign === 'emerald' ? 'linear-gradient(135deg, #50c878, #00ff7f, #32cd32)' :
                                     selectedTimerDesign === 'sapphire' ? 'linear-gradient(135deg, #0f52ba, #4169e1, #0000ff)' :
                                     selectedTimerDesign === 'ruby' ? 'linear-gradient(135deg, #e0115f, #dc143c, #b22222)' :
                                     selectedTimerDesign === 'diamond' ? 'linear-gradient(135deg, #ffffff, #f0f8ff, #e6f3ff)' :
                                     selectedTimerDesign === 'copper' ? 'linear-gradient(135deg, #b87333, #cd7f32, #daa520)' :
                                     selectedTimerDesign === 'rose-gold' ? 'linear-gradient(135deg, #e8b4b8, #f4c2c2, #ffb6c1)' :
                                     selectedTimerDesign === 'platinum' ? 'linear-gradient(135deg, #e5e4e2, #f5f5f5, #ffffff)' :
                                     selectedTimerDesign === 'bronze' ? 'linear-gradient(135deg, #cd7f32, #daa520, #b8860b)' :
                                     selectedTimerDesign === 'pearl' ? 'linear-gradient(135deg, #f8f6f0, #f5f5dc, #fff8dc)' :
                                     selectedTimerDesign === 'opal' ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)' :
                                     selectedTimerDesign === 'amethyst' ? 'linear-gradient(135deg, #9966cc, #8a2be2, #9370db)' :
                                     selectedTimerDesign === 'citrine' ? 'linear-gradient(135deg, #e4d00a, #ffd700, #ffff00)' :
                                     selectedTimerDesign === 'aquamarine' ? 'linear-gradient(135deg, #7fffd4, #40e0d0, #00ced1)' :
                                     selectedTimerDesign === 'topaz' ? 'linear-gradient(135deg, #ffc87c, #ffd700, #ffa500)' :
                                     selectedTimerDesign === 'massive' ? 'linear-gradient(135deg, #ffffff, #f0f0f0)' :
                                     selectedTimerDesign === 'split-screen' ? 'linear-gradient(90deg, #000000 50%, #00ff00 50%)' :
                                     selectedTimerDesign === 'floating' ? 'linear-gradient(135deg, #4a90e2, #7b68ee, #9370db)' :
                                     selectedTimerDesign === 'typewriter' ? 'linear-gradient(135deg, #f5f5f5, #e8e8e8)' :
                                     selectedTimerDesign === 'led-display' ? 'linear-gradient(135deg, #000000, #001100)' :
                                     selectedTimerDesign === 'neon-sign' ? 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff)' :
                                     selectedTimerDesign === 'hologram' ? 'linear-gradient(45deg, #00ffff, #ff00ff, #00ff00, #ffff00, #ff00ff)' :
                                     selectedTimerDesign === 'water-drop' ? 'linear-gradient(135deg, #00bfff, #87ceeb, #add8e6)' :
                                     selectedTimerDesign === 'smoke' ? 'linear-gradient(135deg, #ffffff, #f0f0f0, #e0e0e0)' :
                                     selectedTimerDesign === 'glitch' ? 'linear-gradient(45deg, #ff0000, #00ffff, #ff0000, #00ffff)' :
                                     selectedTimerDesign === 'mosaic' ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)' :
                                     selectedTimerDesign === 'origami' ? 'linear-gradient(135deg, #ff6b6b, #ff8e8e, #ffb3b3)' :
                                     selectedTimerDesign === 'chalkboard' ? 'linear-gradient(135deg, #2c3e50, #34495e)' :
                                     selectedTimerDesign === 'neon-tube' ? 'linear-gradient(135deg, #00ffff, #0080ff, #0040ff)' :
                                     selectedTimerDesign === 'crystal-grow' ? 'linear-gradient(135deg, #ffffff, #f0f8ff, #e6f3ff)' :
                                     selectedTimerDesign === 'magnetic' ? 'linear-gradient(135deg, #ff00ff, #8000ff, #4000ff)' :
                                     selectedTimerDesign === 'liquid-metal' ? 'linear-gradient(135deg, #c0c0c0, #a0a0a0, #808080)' :
                                     selectedTimerDesign === 'energy-field' ? 'linear-gradient(135deg, #ffff00, #ffaa00, #ff5500)' :
                                     selectedTimerDesign === 'quantum' ? 'linear-gradient(135deg, #00ff00, #00aa00, #005500)' :
                                     selectedTimerDesign === 'time-vortex' ? 'linear-gradient(45deg, #ffffff, #f0f0f0, #e0e0e0, #d0d0d0)' :
                                     selectedTimerDesign === 'giant' ? 'linear-gradient(135deg, #ffffff, #f0f0f0, #e0e0e0)' :
                                     selectedTimerDesign === 'cyberpunk' ? 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff, #8000ff)' :
                                     selectedTimerDesign === 'matrix-code' ? 'linear-gradient(135deg, #000000, #001100, #003300)' :
                                     selectedTimerDesign === 'laser' ? 'linear-gradient(135deg, #ff0000, #ff4000, #ff8000)' :
                                     selectedTimerDesign === 'plasma' ? 'linear-gradient(135deg, #ffff00, #ffaa00, #ff5500, #ff0000)' :
                                     selectedTimerDesign === 'void' ? 'linear-gradient(135deg, #000000, #111111, #222222)' :
                                     'none',
                      backgroundColor: selectedTimerDesign === 'transparent' ? 'rgba(255, 255, 255, 0.05)' :
                                     selectedTimerDesign === 'cyber' ? 'rgba(0, 0, 0, 0.8)' :
                                     selectedTimerDesign === 'monochrome' ? '#ffffff' :
                                     selectedTimerDesign === 'ice' ? 'rgba(176, 224, 230, 0.1)' :
                                     selectedTimerDesign === 'wood' ? 'rgba(139, 69, 19, 0.1)' :
                                     selectedTimerDesign === 'marble' ? 'rgba(255, 255, 255, 0.05)' :
                                     selectedTimerDesign === 'crystal' ? 'rgba(255, 255, 255, 0.1)' :
                                     selectedTimerDesign === 'vintage' ? 'rgba(139, 69, 19, 0.1)' :
                                     selectedTimerDesign === 'steel' ? 'rgba(113, 121, 126, 0.1)' :
                                     selectedTimerDesign === 'titanium' ? 'rgba(135, 134, 129, 0.1)' :
                                     selectedTimerDesign === 'typewriter' ? 'rgba(245, 245, 245, 0.1)' :
                                     selectedTimerDesign === 'led-display' ? 'rgba(0, 0, 0, 0.8)' :
                                     selectedTimerDesign === 'chalkboard' ? 'rgba(44, 62, 80, 0.1)' :
                                     selectedTimerDesign === 'matrix-code' ? 'rgba(0, 0, 0, 0.9)' :
                                     selectedTimerDesign === 'void' ? 'rgba(0, 0, 0, 0.8)' :
                                     'transparent',
                      backgroundClip: (selectedTimerDesign === 'transparent' || selectedTimerDesign === 'rainbow' || selectedTimerDesign === 'gradient' || selectedTimerDesign === 'gold' || selectedTimerDesign === 'holographic' || selectedTimerDesign === 'aurora' || selectedTimerDesign === 'cosmic' || selectedTimerDesign === 'forest' || selectedTimerDesign === 'sunrise' || selectedTimerDesign === 'moonlight' || selectedTimerDesign === 'coral' || selectedTimerDesign === 'lavender' || selectedTimerDesign === 'emerald' || selectedTimerDesign === 'sapphire' || selectedTimerDesign === 'ruby' || selectedTimerDesign === 'diamond' || selectedTimerDesign === 'copper' || selectedTimerDesign === 'rose-gold' || selectedTimerDesign === 'platinum' || selectedTimerDesign === 'bronze' || selectedTimerDesign === 'pearl' || selectedTimerDesign === 'opal' || selectedTimerDesign === 'amethyst' || selectedTimerDesign === 'citrine' || selectedTimerDesign === 'aquamarine' || selectedTimerDesign === 'topaz' || selectedTimerDesign === 'massive' || selectedTimerDesign === 'floating' || selectedTimerDesign === 'neon-sign' || selectedTimerDesign === 'hologram' || selectedTimerDesign === 'water-drop' || selectedTimerDesign === 'smoke' || selectedTimerDesign === 'mosaic' || selectedTimerDesign === 'origami' || selectedTimerDesign === 'neon-tube' || selectedTimerDesign === 'crystal-grow' || selectedTimerDesign === 'magnetic' || selectedTimerDesign === 'liquid-metal' || selectedTimerDesign === 'energy-field' || selectedTimerDesign === 'quantum' || selectedTimerDesign === 'time-vortex' || selectedTimerDesign === 'giant' || selectedTimerDesign === 'cyberpunk' || selectedTimerDesign === 'laser' || selectedTimerDesign === 'plasma') ? 'text' : 'initial',
                      WebkitBackgroundClip: (selectedTimerDesign === 'transparent' || selectedTimerDesign === 'rainbow' || selectedTimerDesign === 'gradient' || selectedTimerDesign === 'gold' || selectedTimerDesign === 'holographic' || selectedTimerDesign === 'aurora' || selectedTimerDesign === 'cosmic' || selectedTimerDesign === 'forest' || selectedTimerDesign === 'sunrise' || selectedTimerDesign === 'moonlight' || selectedTimerDesign === 'coral' || selectedTimerDesign === 'lavender' || selectedTimerDesign === 'emerald' || selectedTimerDesign === 'sapphire' || selectedTimerDesign === 'ruby' || selectedTimerDesign === 'diamond' || selectedTimerDesign === 'copper' || selectedTimerDesign === 'rose-gold' || selectedTimerDesign === 'platinum' || selectedTimerDesign === 'bronze' || selectedTimerDesign === 'pearl' || selectedTimerDesign === 'opal' || selectedTimerDesign === 'amethyst' || selectedTimerDesign === 'citrine' || selectedTimerDesign === 'aquamarine' || selectedTimerDesign === 'topaz' || selectedTimerDesign === 'massive' || selectedTimerDesign === 'floating' || selectedTimerDesign === 'neon-sign' || selectedTimerDesign === 'hologram' || selectedTimerDesign === 'water-drop' || selectedTimerDesign === 'smoke' || selectedTimerDesign === 'mosaic' || selectedTimerDesign === 'origami' || selectedTimerDesign === 'neon-tube' || selectedTimerDesign === 'crystal-grow' || selectedTimerDesign === 'magnetic' || selectedTimerDesign === 'liquid-metal' || selectedTimerDesign === 'energy-field' || selectedTimerDesign === 'quantum' || selectedTimerDesign === 'time-vortex' || selectedTimerDesign === 'giant' || selectedTimerDesign === 'cyberpunk' || selectedTimerDesign === 'laser' || selectedTimerDesign === 'plasma') ? 'text' : 'initial',
                      WebkitTextFillColor: (selectedTimerDesign === 'transparent' || selectedTimerDesign === 'rainbow' || selectedTimerDesign === 'gradient' || selectedTimerDesign === 'gold' || selectedTimerDesign === 'holographic' || selectedTimerDesign === 'aurora' || selectedTimerDesign === 'cosmic' || selectedTimerDesign === 'forest' || selectedTimerDesign === 'sunrise' || selectedTimerDesign === 'moonlight' || selectedTimerDesign === 'coral' || selectedTimerDesign === 'lavender' || selectedTimerDesign === 'emerald' || selectedTimerDesign === 'sapphire' || selectedTimerDesign === 'ruby' || selectedTimerDesign === 'diamond' || selectedTimerDesign === 'copper' || selectedTimerDesign === 'rose-gold' || selectedTimerDesign === 'platinum' || selectedTimerDesign === 'bronze' || selectedTimerDesign === 'pearl' || selectedTimerDesign === 'opal' || selectedTimerDesign === 'amethyst' || selectedTimerDesign === 'citrine' || selectedTimerDesign === 'aquamarine' || selectedTimerDesign === 'topaz' || selectedTimerDesign === 'massive' || selectedTimerDesign === 'floating' || selectedTimerDesign === 'neon-sign' || selectedTimerDesign === 'hologram' || selectedTimerDesign === 'water-drop' || selectedTimerDesign === 'smoke' || selectedTimerDesign === 'mosaic' || selectedTimerDesign === 'origami' || selectedTimerDesign === 'neon-tube' || selectedTimerDesign === 'crystal-grow' || selectedTimerDesign === 'magnetic' || selectedTimerDesign === 'liquid-metal' || selectedTimerDesign === 'energy-field' || selectedTimerDesign === 'quantum' || selectedTimerDesign === 'time-vortex' || selectedTimerDesign === 'giant' || selectedTimerDesign === 'cyberpunk' || selectedTimerDesign === 'laser' || selectedTimerDesign === 'plasma') ? 'transparent' : 'initial',
                      border: selectedTimerDesign === 'transparent' ? '1px solid rgba(255, 255, 255, 0.2)' :
                              selectedTimerDesign === 'cyber' ? '2px solid #00ff00' :
                              selectedTimerDesign === 'monochrome' ? '3px solid #000000' :
                              selectedTimerDesign === 'ice' ? '1px solid rgba(176, 224, 230, 0.3)' :
                              selectedTimerDesign === 'wood' ? '2px solid #8b4513' :
                              selectedTimerDesign === 'marble' ? '1px solid rgba(255, 255, 255, 0.3)' :
                              selectedTimerDesign === 'crystal' ? '2px solid rgba(255, 255, 255, 0.3)' :
                              selectedTimerDesign === 'vintage' ? '2px solid #8b4513' :
                              selectedTimerDesign === 'steel' ? '1px solid #71797e' :
                              selectedTimerDesign === 'titanium' ? '1px solid #878681' :
                              selectedTimerDesign === 'split-screen' ? '2px solid #00ff00' :
                              selectedTimerDesign === 'typewriter' ? '1px solid #cccccc' :
                              selectedTimerDesign === 'led-display' ? '2px solid #00ff00' :
                              selectedTimerDesign === 'chalkboard' ? '2px solid #2c3e50' :
                              selectedTimerDesign === 'matrix-code' ? '2px solid #00ff00' :
                              selectedTimerDesign === 'void' ? '1px solid #333333' :
                              'none',
                      borderRadius: selectedTimerDesign === 'transparent' ? '20px' :
                                   selectedTimerDesign === 'cyber' ? '10px' :
                                   selectedTimerDesign === 'monochrome' ? '10px' :
                                   selectedTimerDesign === 'ice' ? '15px' :
                                   selectedTimerDesign === 'wood' ? '15px' :
                                   selectedTimerDesign === 'marble' ? '20px' :
                                   selectedTimerDesign === 'crystal' ? '25px' :
                                   selectedTimerDesign === 'vintage' ? '15px' :
                                   selectedTimerDesign === 'steel' ? '5px' :
                                   selectedTimerDesign === 'titanium' ? '5px' :
                                   selectedTimerDesign === 'split-screen' ? '0px' :
                                   selectedTimerDesign === 'typewriter' ? '10px' :
                                   selectedTimerDesign === 'led-display' ? '5px' :
                                   selectedTimerDesign === 'chalkboard' ? '15px' :
                                   selectedTimerDesign === 'matrix-code' ? '5px' :
                                   selectedTimerDesign === 'void' ? '0px' :
                                   '0px',
                      padding: selectedTimerDesign === 'transparent' ? '20px 40px' :
                              selectedTimerDesign === 'cyber' ? '20px' :
                              selectedTimerDesign === 'monochrome' ? '20px' :
                              selectedTimerDesign === 'ice' ? '15px 30px' :
                              selectedTimerDesign === 'wood' ? '15px 30px' :
                              selectedTimerDesign === 'marble' ? '20px 40px' :
                              selectedTimerDesign === 'crystal' ? '25px 50px' :
                              selectedTimerDesign === 'vintage' ? '15px 30px' :
                              selectedTimerDesign === 'steel' ? '10px 20px' :
                              selectedTimerDesign === 'titanium' ? '10px 20px' :
                              selectedTimerDesign === 'massive' ? '40px 80px' :
                              selectedTimerDesign === 'split-screen' ? '20px 40px' :
                              selectedTimerDesign === 'typewriter' ? '15px 30px' :
                              selectedTimerDesign === 'led-display' ? '20px 40px' :
                              selectedTimerDesign === 'chalkboard' ? '20px 40px' :
                              selectedTimerDesign === 'giant' ? '50px 100px' :
                              selectedTimerDesign === 'cyberpunk' ? '25px 50px' :
                              selectedTimerDesign === 'matrix-code' ? '20px 40px' :
                              selectedTimerDesign === 'laser' ? '25px 50px' :
                              selectedTimerDesign === 'plasma' ? '30px 60px' :
                              selectedTimerDesign === 'void' ? '20px 40px' :
                              '0px'
                    }}
                  >
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-white/60 text-sm">
                    {timerModes[mode].description}
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Themes Panel */}
      {showThemes && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-4xl w-full mx-4 border border-white/20 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Choose Theme</h3>
            
            {/* Mini Navigation */}
            <div className="flex gap-2 mb-6 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setSelectedThemeCategory('colors')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                  selectedThemeCategory === 'colors'
                    ? 'bg-white/30 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-lg">🎨</span>
                <span className="font-medium">Colors</span>
              </button>
              <button
                onClick={() => setSelectedThemeCategory('liveBackground')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                  selectedThemeCategory === 'liveBackground'
                    ? 'bg-white/30 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-lg">🌌</span>
                <span className="font-medium">Live Background</span>
              </button>
              <button
                onClick={() => setSelectedThemeCategory('ambient')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                  selectedThemeCategory === 'ambient'
                    ? 'bg-white/30 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-lg">🧘</span>
                <span className="font-medium">Ambient</span>
              </button>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {themeCategories[selectedThemeCategory].length > 0 ? (
                themeCategories[selectedThemeCategory].map((theme) => (
                  <ThemePreview
                    key={theme.id}
                    theme={theme}
                    isSelected={currentTheme === theme.id}
                    onClick={async () => {
                      await handleThemeSelection(theme)
                      setShowThemes(false)
                    }}
                  />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-white/60">
                  <div className="text-4xl mb-4">
                    {selectedThemeCategory === 'liveBackground' ? '🌌' : '🧘'}
                  </div>
                  <div className="text-lg font-medium mb-2">
                    {selectedThemeCategory === 'liveBackground' ? 'Live Background' : 'Ambient'} Themes
                  </div>
                  <div className="text-sm text-center">
                    {selectedThemeCategory === 'liveBackground' 
                      ? themeMixingEnabled 
                        ? 'Select compatible themes to create beautiful combinations!'
                        : 'Choose a single theme for a clean, focused experience.'
                      : 'Coming soon! Use external software for ambient effects.'
                    }
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowThemes(false)}
              className="w-full mt-6 bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}


      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl max-w-6xl w-full mx-4 border border-white/20 max-h-[90vh] overflow-hidden flex">
            {/* Settings Sidebar */}
            <div className="w-64 bg-white/5 border-r border-white/10 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
              </div>
              
              <nav className="space-y-2">
                {[
                  { id: 'themes', name: 'Themes', icon: Palette, active: selectedSettingsCategory === 'themes' },
                  { id: 'timer-designs', name: 'Timer Designs', icon: Clock, active: selectedSettingsCategory === 'timer-designs' },
                  { id: 'timer', name: 'Timer', icon: Target, active: selectedSettingsCategory === 'timer' },
                  { id: 'sounds', name: 'Sounds', icon: Volume2, active: selectedSettingsCategory === 'sounds' },
                  { id: 'notifications', name: 'Notifications', icon: Bell, active: selectedSettingsCategory === 'notifications' },
                  { id: 'display', name: 'Display', icon: Monitor, active: selectedSettingsCategory === 'display' },
                  { id: 'progress', name: 'Progress', icon: BarChart3, active: selectedSettingsCategory === 'progress' },
                  { id: 'shortcuts', name: 'Shortcuts', icon: Keyboard, active: selectedSettingsCategory === 'shortcuts' },
                  { id: 'data', name: 'Data Export', icon: Cloud, active: selectedSettingsCategory === 'data' },
                  { id: 'about', name: 'About', icon: Info, active: selectedSettingsCategory === 'about' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSettingsCategory(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      item.active 
                        ? 'bg-white/20 text-white' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                ))}
              </nav>
              
              <div className="mt-auto pt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors"
                >
                  Close Settings
                </button>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-8 overflow-y-auto">
              {selectedSettingsCategory === 'themes' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Theme Settings</h3>
                  
                  {/* Theme Mixing Settings */}
                  <div className="bg-white/10 rounded-xl p-6 mb-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Theme Mixing</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">Enable Theme Mixing</div>
                          <div className="text-white/60 text-sm">Allow multiple compatible themes to blend together</div>
                        </div>
                        <button
                          onClick={() => setThemeMixingEnabled(!themeMixingEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            themeMixingEnabled ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              themeMixingEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {themeMixingEnabled && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              onClick={resetToSingleTheme}
                              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              Reset to Single Theme
                            </button>
                            <button
                              onClick={generateRandomCombination}
                              className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                            >
                              Random Combination
                            </button>
                          </div>
                          
                          {activeThemes.length > 1 && (
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="text-white/80 text-sm mb-2">Active Themes:</div>
                              <div className="flex flex-wrap gap-2">
                                {activeThemes.map(themeId => {
                                  const theme = themes.find(t => t.id === themeId)
                                  return theme ? (
                                    <div key={themeId} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1">
                                      <span>{theme.emoji}</span>
                                      <span className="text-white text-sm">{theme.name}</span>
                                    </div>
                                  ) : null
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weather Effects Settings */}
                  <div className="bg-white/10 rounded-xl p-6 mb-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Cloud className="w-5 h-5" />
                      Weather Effects
                    </h4>
                    <div className="space-y-4">
                      <div className="text-white/60 text-sm mb-4">Add atmospheric weather effects to enhance your focus session</div>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => toggleWeatherEffect('none')}
                          className={`p-4 rounded-lg text-sm transition-all flex flex-col items-center gap-3 ${
                            weatherEffect === 'none'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          <div className="text-2xl">☀️</div>
                          <span className="font-medium">None</span>
                        </button>
                        <button
                          onClick={() => toggleWeatherEffect('rain')}
                          className={`p-4 rounded-lg text-sm transition-all flex flex-col items-center gap-3 ${
                            weatherEffect === 'rain'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          <div className="text-2xl">🌧️</div>
                          <span className="font-medium">Rain</span>
                        </button>
                        <button
                          onClick={() => toggleWeatherEffect('snow')}
                          className={`p-4 rounded-lg text-sm transition-all flex flex-col items-center gap-3 ${
                            weatherEffect === 'snow'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          <div className="text-2xl">❄️</div>
                          <span className="font-medium">Snow</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini Navigation */}
                  <div className="flex gap-2 mb-6 bg-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setSelectedThemeCategory('colors')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                        selectedThemeCategory === 'colors'
                          ? 'bg-white/30 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">🎨</span>
                      <span className="font-medium">Colors</span>
                    </button>
                    <button
                      onClick={() => setSelectedThemeCategory('liveBackground')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                        selectedThemeCategory === 'liveBackground'
                          ? 'bg-white/30 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">🌌</span>
                      <span className="font-medium">Live Background</span>
                    </button>
                    <button
                      onClick={() => setSelectedThemeCategory('ambient')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                        selectedThemeCategory === 'ambient'
                          ? 'bg-white/30 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">🧘</span>
                      <span className="font-medium">Ambient</span>
                    </button>
                  </div>

                  {/* Theme Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {themeCategories[selectedThemeCategory].length > 0 ? (
                      themeCategories[selectedThemeCategory].map((theme) => (
                        <ThemePreview
                          key={theme.id}
                          theme={theme}
                          isSelected={currentTheme === theme.id}
                          onClick={async () => {
                            await handleThemeSelection(theme)
                            setShowSettings(false)
                          }}
                        />
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-white/60">
                        <div className="text-4xl mb-4">
                          {selectedThemeCategory === 'liveBackground' ? '🌌' : '🧘'}
                        </div>
                        <div className="text-lg font-medium mb-2">
                          {selectedThemeCategory === 'liveBackground' ? 'Live Background' : 'Ambient'} Themes
                        </div>
                        <div className="text-sm text-center">
                          {selectedThemeCategory === 'liveBackground' 
                            ? themeMixingEnabled 
                              ? 'Select compatible themes to create beautiful combinations!'
                              : 'Choose a single theme for a clean, focused experience.'
                            : 'Coming soon! Use external software for ambient effects.'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'timer-designs' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Timer Designs</h3>
                  <div className="text-white/60 text-sm mb-6">
                    Choose from 24 beautiful timer designs to match your style and mood
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {timerDesigns.map((design) => (
                      <button
                        key={design.id}
                        onClick={() => setSelectedTimerDesign(design.id)}
                        className={`p-4 rounded-xl transition-all text-left ${
                          selectedTimerDesign === design.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{design.emoji}</span>
                          <div>
                            <div className="font-semibold">{design.name}</div>
                            <div className="text-xs opacity-80">{design.description}</div>
                          </div>
                        </div>
                        <div className="text-xs opacity-60">
                          {design.hasCircle ? 'With Circle' : 'No Circle'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'timer' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Timer Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Durations (minutes)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-white/80 text-sm mb-2">Focus Session</label>
                          <input
                            type="number"
                            value={durations.focus}
                            onChange={(e) => setDurations(prev => ({ ...prev, focus: parseInt(e.target.value) || 25 }))}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                            min="1"
                            max="60"
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2">Short Break</label>
                          <input
                            type="number"
                            value={durations.shortBreak}
                            onChange={(e) => setDurations(prev => ({ ...prev, shortBreak: parseInt(e.target.value) || 5 }))}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                            min="1"
                            max="30"
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2">Long Break</label>
                          <input
                            type="number"
                            value={durations.longBreak}
                            onChange={(e) => setDurations(prev => ({ ...prev, longBreak: parseInt(e.target.value) || 15 }))}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                            min="1"
                            max="60"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'sounds' && (
                <div>
                  {/* Header with Controls */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Sounds</h3>
                    <div className="flex items-center gap-3">
                      {/* Playback Controls */}
                      <button
                        onClick={() => {
                          if (isAmbientPlaying) {
                            stopAmbientSound()
                          } else if (selectedAmbientSound) {
                            playAmbientSound(selectedAmbientSound)
                          }
                        }}
                        className="w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center transition-colors"
                      >
                        {isAmbientPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white" />
                        )}
                      </button>
                      
                      {/* Category Filter */}
                      <select
                        value={soundCategory}
                        onChange={(e) => setSoundCategory(e.target.value)}
                        className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {soundCategories.map((category) => (
                          <option key={category.id} value={category.id} className="bg-gray-800">
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ambient Sounds Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {ambientSounds
                      .filter(sound => soundCategory === 'all' || sound.category === soundCategory)
                      .map((sound) => (
                        <div key={sound.id} className="relative">
                          <button
                            onClick={() => toggleAmbientSound(sound.id)}
                            disabled={isLoadingSound === sound.id}
                            className={`w-full p-4 rounded-xl transition-all relative ${
                              selectedAmbientSound === sound.id
                                ? 'bg-purple-500/30 border-2 border-purple-400'
                                : 'bg-white/10 border border-white/20 hover:bg-white/20'
                            } ${isLoadingSound === sound.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {/* Loading Spinner */}
                            {isLoadingSound === sound.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                              </div>
                            )}
                            
                            {/* Sound Icon */}
                            <div className="text-3xl mb-3">{sound.emoji}</div>
                            
                            {/* Sound Name */}
                            <div className="text-white font-medium text-sm text-center">
                              {isLoadingSound === sound.id ? 'Loading...' : sound.name}
                            </div>
                            
                            {/* Volume Slider for Each Sound */}
                            <div className="mt-3">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={getSoundVolume(sound.id)}
                                onChange={(e) => updateSoundVolume(sound.id, parseInt(e.target.value))}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                                disabled={isLoadingSound === sound.id}
                              />
                            </div>
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Completion Sounds Section */}
                  <div className="bg-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">Completion Sounds</h4>
                      <button
                        onClick={playCompletionSound}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Test Sound
                      </button>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {completionSounds.map((sound) => (
                        <button
                          key={sound.id}
                          onClick={() => setSelectedSound(sound.id)}
                          className={`p-3 rounded-lg transition-all ${
                            selectedSound === sound.id
                              ? 'bg-purple-500/30 border-2 border-purple-400'
                              : 'bg-white/10 border border-white/20 hover:bg-white/20'
                          }`}
                        >
                          <div className="text-2xl mb-2">{sound.emoji}</div>
                          <div className="text-white font-medium text-xs text-center">{sound.name}</div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Mute Toggle */}
                    <div className="flex items-center justify-between mt-6">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Mute Sounds</h4>
                        <p className="text-white/60 text-sm">Disable all completion sounds</p>
                      </div>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          isMuted ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          isMuted ? 'translate-x-6' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {selectedSettingsCategory === 'notifications' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Notification Settings</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Enable Notifications</h4>
                        <p className="text-white/60 text-sm">Get notified when sessions complete</p>
                      </div>
                      <button
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          notificationsEnabled ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'display' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Display Settings</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Fullscreen Mode</h4>
                        <p className="text-white/60 text-sm">Toggle fullscreen for distraction-free focus</p>
                      </div>
                      <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          isFullscreen ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          isFullscreen ? 'translate-x-6' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Projector Mode</h4>
                        <p className="text-white/60 text-sm">Optimized for projector viewing - larger text, bigger controls, high contrast</p>
                      </div>
                      <button
                        onClick={() => setProjectorMode(!projectorMode)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          projectorMode ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          projectorMode ? 'translate-x-6' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'data' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Data Export</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Export Data</h4>
                      <p className="text-white/60 text-sm mb-4">Download your session data as JSON</p>
                      <button
                        onClick={exportData}
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                      >
                        Export Data
                      </button>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Clear Data</h4>
                      <p className="text-white/60 text-sm mb-4">Reset all sessions and statistics</p>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                            localStorage.removeItem('focusTimerSessions')
                            localStorage.removeItem('focusTimerSettings')
                            setSessions([])
                            setSessionsCompleted(0)
                          }
                        }}
                        className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                      >
                        Clear All Data
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'progress' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Your Progress</h3>
                  
                  {/* Progress Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{sessionsCompleted}</div>
                      <div className="text-white/70 text-sm">Total Sessions</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{Math.floor(sessionsCompleted * 25 / 60)}h</div>
                      <div className="text-white/70 text-sm">Focus Time</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{sessions.length}</div>
                      <div className="text-white/70 text-sm">All Sessions</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">{Math.floor(sessions.length * 25 / 60)}h</div>
                      <div className="text-white/70 text-sm">Total Time</div>
                    </div>
                  </div>
                  
                  {/* Recent Sessions */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Recent Sessions</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {sessions.slice(-10).reverse().map((session) => (
                        <div key={session.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              session.mode === 'focus' ? 'bg-red-500' : 
                              session.mode === 'shortBreak' ? 'bg-green-500' : 'bg-blue-500'
                            }`}></div>
                            <div>
                              <div className="text-white font-medium">
                                {session.mode === 'focus' ? 'Focus' : 
                                 session.mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
                              </div>
                              <div className="text-white/60 text-sm">
                                {new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-white/60 text-sm">
                            {Math.floor(session.duration / 60)}m
                          </div>
                        </div>
                      ))}
                      {sessions.length === 0 && (
                        <div className="text-white/60 text-center py-8">
                          No sessions completed yet. Start your first focus session!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'shortcuts' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Keyboard Shortcuts</h3>
                  <div className="space-y-4">
                    {keyboardShortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-white/10">
                        <span className="text-white/80">{shortcut.action}</span>
                        <kbd className="px-3 py-1 bg-white/10 text-white/80 rounded text-sm font-mono">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSettingsCategory === 'about' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">About Focus Timer</h3>
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-2">Version</h4>
                      <p className="text-white/60">1.0.0</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-2">Features</h4>
                      <ul className="text-white/60 space-y-1">
                        <li>• Pomodoro Technique Timer</li>
                        <li>• 50+ Beautiful Themes</li>
                        <li>• Customizable Durations</li>
                        <li>• Session Tracking</li>
                        <li>• Sound Notifications</li>
                        <li>• Keyboard Shortcuts</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Congratulations Popup */}
      {showCongrats && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 text-center animate-pulse">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-4">{congratsMessage}</h3>
            <div className="text-white/70 text-sm">
              Time for a well-deserved break!
            </div>
          </div>
        </div>
      )}

      {/* Break Complete Popup */}
      {showBreakComplete && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 text-center animate-pulse">
            <div className="text-6xl mb-4">💪</div>
            <h3 className="text-2xl font-bold text-white mb-4">{breakMessage}</h3>
            <div className="text-white/70 text-sm">
              Ready to focus and achieve your goals?
            </div>
          </div>
        </div>
      )}
    </>
  )
}





