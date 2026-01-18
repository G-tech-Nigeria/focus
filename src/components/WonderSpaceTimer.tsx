import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Play, 
  Pause, 
  Image,
  Volume2,
  Timer,
  Music,
  ListTodo,
  BarChart3,
  Maximize2,
  Minimize2,
  X,
  Cloud,
  Snowflake,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react'

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

interface Sound {
  id: string
  name: string
  icon: string
  file: string
  category: string
}

interface Theme {
  id: string
  name: string
  image: string
  category: string
  isVideo?: boolean
  isGradient?: boolean
  gradient?: string
  emoji?: string
  description?: string
}


export default function WonderSpaceTimer() {
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<TimerMode>('focus')
  const [focusTitle, setFocusTitle] = useState('')
  
  // UI State
  const [showSoundsPanel, setShowSoundsPanel] = useState(false)
  const [showThemesPanel, setShowThemesPanel] = useState(false)
  const [showTimerPanel, setShowTimerPanel] = useState(false)
  const [showClockDesignPanel, setShowClockDesignPanel] = useState(false)
  const [showSpotifyPanel, setShowSpotifyPanel] = useState(false)
  const [showAnimationsTab, setShowAnimationsTab] = useState(false)
  const [themeTab, setThemeTab] = useState<'static' | 'live' | 'colors'>('static')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Theme & Effects State
  const [currentTheme, setCurrentTheme] = useState('room')
  const [selectedTimerDesign, setSelectedTimerDesign] = useState('default')
  const [rainEnabled, setRainEnabled] = useState(false)
  const [snowEnabled, setSnowEnabled] = useState(true)
  
  // Sound State
  const [activeSounds, setActiveSounds] = useState<Record<string, number>>({})
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({})
  
  // Timer Settings
  const [focusDuration, setFocusDuration] = useState(25)
  const [shortBreakDuration, setShortBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)

  // Spotify Playlist State
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<string | null>(null)
  const [customPlaylistUrl, setCustomPlaylistUrl] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Themes data - Static
  const staticThemes: Theme[] = [
    { id: 'cozy-room', name: 'Anime Cozy Home', image: '/ambient-themes/static/anime-style-cozy-home-interior-with-furnishings.jpg', category: 'Anime' },
    { id: 'cabin', name: 'Rustic Cabin', image: '/ambient-themes/static/Cabin.jpg', category: 'Nature' },
    { id: 'convenience-store', name: 'Convenience Store', image: '/ambient-themes/static/ConvinenceStore.jpg', category: 'City' },
    { id: 'countryside', name: 'Countryside Morning', image: '/ambient-themes/static/CountrysideMorning.jpg', category: 'Nature' },
    { id: 'forest', name: 'Forest Path', image: '/ambient-themes/static/Forest.jpg', category: 'Nature' },
    { id: 'lofi-cafe', name: 'Lofi Cafe', image: '/ambient-themes/static/LofiCafe.jpg', category: 'Cafe' },
    { id: 'mountain-vista', name: 'Mountain Vista', image: '/ambient-themes/static/bailey-zindel-NRQV-hBF10M-unsplash.jpg', category: 'Nature' },
    { id: 'beautiful-office', name: 'Beautiful Office', image: '/ambient-themes/static/beautiful-office-space-cartoon-style.jpg', category: 'Anime' },
    { id: 'bedroom', name: 'Cozy Bedroom', image: '/ambient-themes/static/bedroom.jpg', category: 'Anime' },
    { id: 'urban-night', name: 'Urban Night', image: '/ambient-themes/static/ciaran-o-brien-LoGWCnEVDgU-unsplash.jpg', category: 'City' },
    { id: 'apartment-sunset', name: 'Apartment Sunset', image: '/ambient-themes/static/cozy-apartment-sunset-view.jpg', category: 'Anime' },
    { id: 'student-room', name: 'Student Room', image: '/ambient-themes/static/cozy-room-with-sunset-student.jpg', category: 'Anime' },
    { id: 'thunderstorm', name: 'Thunderstorm', image: '/ambient-themes/static/digital-art-style-illustration-thunderstorm.jpg', category: 'Nature' },
    { id: 'ocean-waves', name: 'Ocean Waves', image: '/ambient-themes/static/ian-valerio-CAFq0pv9HjY-unsplash.jpg', category: 'Nature' },
    { id: 'mountain-lake', name: 'Mountain Lake', image: '/ambient-themes/static/kyle-bushnell-Zi3Pt6lW1eo-unsplash.jpg', category: 'Nature' },
    { id: 'forest-cabin', name: 'Forest Cabin', image: '/ambient-themes/static/mark-basarab-1OtUkD_8svc-unsplash.jpg', category: 'Nature' },
    { id: 'aurora', name: 'Aurora Borealis', image: '/ambient-themes/static/matthew-smith-Rfflri94rs8-unsplash.jpg', category: 'Nature' },
    { id: 'rainy-city', name: 'Rainy City Night', image: '/ambient-themes/static/rainy-night-city-view-from-cozy-bedroom.jpg', category: 'City' },
    { id: 'thunderstorm-city', name: 'Thunderstorm City', image: '/ambient-themes/static/thunderstorm-city.jpg', category: 'City' },
    { id: 'winter-cabin', name: 'Winter Cabin', image: '/ambient-themes/static/winterCabin.jpg', category: 'Nature' },
    { id: 'room', name: 'Cozy Room', image: '/ambient-themes/static/Room.webp', category: 'Anime' },
  ]

  // Themes data - Live/Video
  const liveThemes: Theme[] = [
    { id: 'video1', name: 'Cosmic Journey', image: '/ambient-themes/animated/204241-923909574_small.mp4', category: 'Live', isVideo: true },
    { id: 'video2', name: 'Ocean Depths', image: '/ambient-themes/animated/208106_small.mp4', category: 'Live', isVideo: true },
    { id: 'video3', name: 'Forest Serenity', image: '/ambient-themes/animated/208812_small.mp4', category: 'Live', isVideo: true },
    { id: 'video4', name: 'Mountain Vista', image: '/ambient-themes/animated/209204_large.mp4', category: 'Live', isVideo: true },
    { id: 'video5', name: 'City Lights', image: '/ambient-themes/animated/270983.mp4', category: 'Live', isVideo: true },
    { id: 'video6', name: 'Abstract Flow', image: '/ambient-themes/animated/276498_small.mp4', category: 'Live', isVideo: true },
    { id: 'video7', name: 'Desert Sunset', image: '/ambient-themes/animated/297736_small.mp4', category: 'Live', isVideo: true },
    { id: 'video8', name: 'Digital Waves', image: '/ambient-themes/animated/301247_small.mp4', category: 'Live', isVideo: true },
  ]

  // Color Gradient Themes
  const colorThemes: Theme[] = [
    { id: 'purple-dreams', name: 'Purple Dreams', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', emoji: '💜', description: 'Soft purple gradient' },
    { id: 'sunset-vibes', name: 'Sunset Vibes', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f093fb 100%)', emoji: '🌅', description: 'Warm sunset colors' },
    { id: 'forest-deep', name: 'Forest Deep', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', emoji: '🌲', description: 'Deep forest green' },
    { id: 'ocean-depths', name: 'Ocean Depths', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)', emoji: '🌊', description: 'Deep ocean blue' },
    { id: 'cosmic-space', name: 'Cosmic Space', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', emoji: '🌌', description: 'Deep space colors' },
    { id: 'minimal-gray', name: 'Minimal Gray', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)', emoji: '⚫', description: 'Clean minimal look' },
    { id: 'rose-gold', name: 'Rose Gold', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f4c4f3 0%, #fc67fa 100%)', emoji: '🌹', description: 'Elegant rose gold' },
    { id: 'emerald-city', name: 'Emerald City', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', emoji: '💚', description: 'Rich emerald green' },
    { id: 'aurora-borealis', name: 'Aurora Borealis', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #7c3aed 100%)', emoji: '🌈', description: 'Northern lights dancing' },
    { id: 'galaxy-spiral', name: 'Galaxy Spiral', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)', emoji: '🌀', description: 'Cosmic spiral galaxy' },
    { id: 'flickering-fire', name: 'Flickering Fire', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', emoji: '🔥', description: 'Warm campfire glow' },
    { id: 'ocean-waves', name: 'Ocean Waves', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', emoji: '🏄', description: 'Gentle ocean waves' },
    { id: 'floating-particles', name: 'Floating Particles', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #4568dc 0%, #b06ab3 100%)', emoji: '✨', description: 'Floating light particles' },
    { id: 'matrix-rain', name: 'Matrix Rain', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #000000 0%, #0f9b0f 100%)', emoji: '💚', description: 'Digital rain effect' },
    { id: 'zen-garden', name: 'Zen Garden', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #c9d6ff 0%, #e2e2e2 100%)', emoji: '🧘', description: 'Peaceful zen atmosphere' },
    { id: 'cozy-library', name: 'Cozy Library', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)', emoji: '📚', description: 'Warm library ambiance' },
    { id: 'coffee-shop', name: 'Coffee Shop', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #c79081 0%, #dfa579 100%)', emoji: '☕', description: 'Coffee shop vibes' },
    { id: 'rainy-day', name: 'Rainy Day', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #373b44 0%, #4286f4 100%)', emoji: '🌧️', description: 'Gentle rain sounds' },
    { id: 'midnight-city', name: 'Midnight City', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)', emoji: '🌃', description: 'Urban night atmosphere' },
    { id: 'mountain-peak', name: 'Mountain Peak', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #3a6186 0%, #89253e 100%)', emoji: '⛰️', description: 'Mountain serenity' },
    { id: 'lavender-fields', name: 'Lavender Fields', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #e6dee9 0%, #a18cd1 100%)', emoji: '💜', description: 'Soft lavender dream' },
    { id: 'coral-reef', name: 'Coral Reef', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', emoji: '🪸', description: 'Vibrant coral beauty' },
    { id: 'mint-fresh', name: 'Mint Fresh', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', emoji: '🌿', description: 'Cool mint refresh' },
    { id: 'peach-sunset', name: 'Peach Sunset', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', emoji: '🍑', description: 'Warm peach glow' },
    { id: 'turquoise-waters', name: 'Turquoise Waters', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)', emoji: '💎', description: 'Crystal clear waters' },
    { id: 'golden-hour', name: 'Golden Hour', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', emoji: '✨', description: 'Magical golden light' },
    { id: 'deep-plum', name: 'Deep Plum', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #360033 0%, #0b8793 100%)', emoji: '🍇', description: 'Rich plum depth' },
    { id: 'sage-wisdom', name: 'Sage Wisdom', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #8e9eab 0%, #eef2f3 100%)', emoji: '🌿', description: 'Calming sage tones' },
    { id: 'cherry-blossom', name: 'Cherry Blossom', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ff9a9e 100%)', emoji: '🌸', description: 'Delicate cherry bloom' },
    { id: 'midnight-blue', name: 'Midnight Blue', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', emoji: '🌙', description: 'Deep midnight mystery' },
    { id: 'apricot-dreams', name: 'Apricot Dreams', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)', emoji: '🍊', description: 'Sweet apricot delight' },
    { id: 'jade-serenity', name: 'Jade Serenity', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', emoji: '🟢', description: 'Peaceful jade calm' },
    { id: 'crimson-passion', name: 'Crimson Passion', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)', emoji: '❤️', description: 'Intense crimson fire' },
    { id: 'silver-mist', name: 'Silver Mist', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)', emoji: '🌫️', description: 'Elegant silver shimmer' },
    { id: 'tangerine-burst', name: 'Tangerine Burst', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', emoji: '🍊', description: 'Zesty tangerine energy' },
    { id: 'periwinkle-sky', name: 'Periwinkle Sky', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #7f7fd5 0%, #86a8e7 50%, #91eae4 100%)', emoji: '☁️', description: 'Soft periwinkle clouds' },
    { id: 'mahogany-rich', name: 'Mahogany Rich', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #4e342e 0%, #8d6e63 100%)', emoji: '🪵', description: 'Luxurious mahogany wood' },
    { id: 'lime-zest', name: 'Lime Zest', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)', emoji: '🍋', description: 'Fresh lime zing' },
    { id: 'violet-dreams', name: 'Violet Dreams', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)', emoji: '💜', description: 'Mystical violet magic' },
    { id: 'copper-glow', name: 'Copper Glow', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #b79891 0%, #94716b 100%)', emoji: '🔶', description: 'Warm copper shine' },
    { id: 'electric-blue', name: 'Electric Blue', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #0575e6 0%, #021b79 100%)', emoji: '⚡', description: 'Vibrant electric pulse' },
    { id: 'strawberry-cream', name: 'Strawberry Cream', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)', emoji: '🍓', description: 'Sweet strawberry swirl' },
    { id: 'neon-nights', name: 'Neon Nights', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)', emoji: '🌃', description: 'Vibrant neon glow' },
    { id: 'autumn-leaves', name: 'Autumn Leaves', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #d38312 0%, #a83279 100%)', emoji: '🍂', description: 'Warm autumn colors' },
    { id: 'arctic-frost', name: 'Arctic Frost', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', emoji: '❄️', description: 'Cool arctic chill' },
    { id: 'tropical-paradise', name: 'Tropical Paradise', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', emoji: '🏝️', description: 'Tropical island vibes' },
    { id: 'royal-purple', name: 'Royal Purple', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #41295a 0%, #2f0743 100%)', emoji: '👑', description: 'Majestic royal hues' },
    { id: 'candy-pink', name: 'Candy Pink', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)', emoji: '🍬', description: 'Sweet candy colors' },
    { id: 'deep-sea', name: 'Deep Sea', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)', emoji: '🐋', description: 'Deep ocean mystery' },
    { id: 'sunset-beach', name: 'Sunset Beach', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)', emoji: '🏖️', description: 'Beach sunset glow' },
    { id: 'mystic-forest', name: 'Mystic Forest', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #0f3443 0%, #34e89e 100%)', emoji: '🌳', description: 'Enchanted forest' },
    { id: 'cotton-candy', name: 'Cotton Candy', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ff9a9e 100%)', emoji: '🍭', description: 'Fluffy cotton candy' },
    { id: 'northern-lights', name: 'Northern Lights', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', emoji: '🌌', description: 'Dancing aurora' },
    { id: 'wine-red', name: 'Wine Red', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #722f37 0%, #a94442 100%)', emoji: '🍷', description: 'Rich wine tones' },
    { id: 'ocean-breeze', name: 'Ocean Breeze', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)', emoji: '🌬️', description: 'Fresh ocean air' },
    { id: 'mango-tango', name: 'Mango Tango', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ffe259 0%, #ffa751 100%)', emoji: '🥭', description: 'Tropical mango burst' },
    { id: 'blueberry-bliss', name: 'Blueberry Bliss', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #4776e6 0%, #8e54e9 100%)', emoji: '🫐', description: 'Sweet blueberry hues' },
    { id: 'sunset-gradient', name: 'Sunset Gradient', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', emoji: '🌇', description: 'Beautiful sunset fade' },
    { id: 'pure-black', name: 'Pure Black', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #000000 0%, #000000 100%)', emoji: '⚫', description: 'Deep black void' },
    { id: 'ice-cream', name: 'Ice Cream', image: '', category: 'Colors', isGradient: true, gradient: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)', emoji: '🍦', description: 'Creamy pastel swirl' },
  ]

  const themes = [...staticThemes, ...liveThemes, ...colorThemes]

  // Timer Designs
  const timerDesigns = [
    { id: 'default', name: 'Default', emoji: '⏰', description: 'Clean and minimal' },
    { id: 'neon', name: 'Neon', emoji: '⚡', description: 'Electric glow effect' },
    { id: 'retro', name: 'Retro', emoji: '📺', description: '80s synthwave vibes' },
    { id: 'cyber', name: 'Cyber', emoji: '🤖', description: 'Matrix-style digital' },
    { id: 'glassmorphism', name: 'Glass', emoji: '🔮', description: 'Frosted glass effect' },
    { id: 'neon-pink', name: 'Neon Pink', emoji: '💖', description: 'Hot pink glow' },
    { id: 'gold', name: 'Gold', emoji: '✨', description: 'Luxurious golden shine' },
    { id: 'holographic', name: 'Holographic', emoji: '💿', description: 'Iridescent shimmer' },
    { id: 'led-display', name: 'LED Display', emoji: '🔢', description: 'Digital LED matrix' },
    { id: 'massive', name: 'Massive', emoji: '📏', description: 'Huge screen-filling' },
    { id: 'matrix-code', name: 'Matrix', emoji: '💚', description: 'Falling green code' },
    { id: 'minimal', name: 'Minimal', emoji: '⚪', description: 'Ultra clean' },
  ]

  // Sounds data
  const sounds: Sound[] = [
    { id: 'rain', name: 'Rain', icon: '🌧️', file: '/sounds/rain.mp3', category: 'nature' },
    { id: 'wind', name: 'Wind', icon: '💨', file: '/sounds/wind.mp3', category: 'nature' },
    { id: 'fire', name: 'Campfire', icon: '🔥', file: '/sounds/campfire.mp3', category: 'nature' },
    { id: 'waves', name: 'Waves', icon: '🌊', file: '/sounds/waves.mp3', category: 'nature' },
    { id: 'birds', name: 'Birds', icon: '🐦', file: '/sounds/birds.mp3', category: 'nature' },
    { id: 'thunder', name: 'Thunder', icon: '⛈️', file: '/sounds/thunder.mp3', category: 'nature' },
    { id: 'cafe', name: 'Cafe', icon: '☕', file: '/sounds/cafe.mp3', category: 'ambient' },
    { id: 'keyboard', name: 'Keyboard', icon: '⌨️', file: '/sounds/keyboard.mp3', category: 'ambient' },
  ]

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      handleTimerComplete()
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timeLeft])

  const handleTimerComplete = () => {
    setIsRunning(false)
    if (mode === 'focus') {
      // Play notification sound
      const audio = new Audio('/sounds/notification.mp3')
      audio.play().catch(() => {})
    }
  }

  const toggleTimer = () => setIsRunning(!isRunning)

  const resetTimer = () => {
    setIsRunning(false)
    const durations = { focus: focusDuration, shortBreak: shortBreakDuration, longBreak: longBreakDuration }
    setTimeLeft(durations[mode] * 60)
  }

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode)
    setIsRunning(false)
    const durations = { focus: focusDuration, shortBreak: shortBreakDuration, longBreak: longBreakDuration }
    setTimeLeft(durations[newMode] * 60)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleSound = (soundId: string) => {
    if (activeSounds[soundId]) {
      // Stop sound
      if (audioElements[soundId]) {
        audioElements[soundId].pause()
        audioElements[soundId].currentTime = 0
      }
      setActiveSounds(prev => {
        const newSounds = { ...prev }
        delete newSounds[soundId]
        return newSounds
      })
    } else {
      // Start sound
      const sound = sounds.find(s => s.id === soundId)
      if (sound) {
        const audio = new Audio(sound.file)
        audio.loop = true
        audio.volume = 0.5
        audio.play().catch(() => {})
        setAudioElements(prev => ({ ...prev, [soundId]: audio }))
        setActiveSounds(prev => ({ ...prev, [soundId]: 50 }))
      }
    }
  }

  const updateSoundVolume = (soundId: string, volume: number) => {
    if (audioElements[soundId]) {
      audioElements[soundId].volume = volume / 100
    }
    setActiveSounds(prev => ({ ...prev, [soundId]: volume }))
  }

  const currentThemeData = themes.find(t => t.id === currentTheme) || themes[0]

  // Generate stable snowflakes array - start from top, fall to bottom slowly
  const snowflakes = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // Random horizontal position
      size: 3 + Math.random() * 6, // 3-9px
      opacity: 0.4 + Math.random() * 0.5, // 40-90% opacity
      duration: 45 + Math.random() * 30, // VERY SLOW: 45-75 seconds to fall
      delay: Math.random() * 15, // Stagger start times
      blur: Math.random() > 0.7, // 30% have slight blur for depth
    }))
  }, [])

  const closeAllPanels = () => {
    setShowSoundsPanel(false)
    setShowThemesPanel(false)
    setShowTimerPanel(false)
    setShowClockDesignPanel(false)
    setShowSpotifyPanel(false)
  }

  // Spotify Playlists - curated focus playlists
  const spotifyPlaylists = [
    { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Lofi Beats', description: 'Chill beats to study/relax to', image: '🎵' },
    { id: '37i9dQZF1DX8Uebhn9wzrS', name: 'Chill Lofi Study Beats', description: 'The perfect study companion', image: '📚' },
    { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus', description: 'Keep calm and focus', image: '🧠' },
    { id: '37i9dQZF1DX9sIqqvKsjG8', name: 'Ambient Relaxation', description: 'Peaceful ambient sounds', image: '🌿' },
    { id: '37i9dQZF1DX3Ogo9pFvBkY', name: 'Peaceful Piano', description: 'Relax with beautiful piano', image: '🎹' },
    { id: '37i9dQZF1DWYoYGBbGKurt', name: 'Coding Mode', description: 'Electronic beats for coding', image: '💻' },
    { id: '37i9dQZF1DX0SM0LYsmbMT', name: 'Jazz Vibes', description: 'Smooth jazz for focus', image: '🎷' },
    { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Guitar', description: 'Acoustic guitar melodies', image: '🎸' },
  ]

  // Base text shadow for visibility on any background - clean and subtle
  const baseTextShadow = '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)'

  // Get timer style based on selected design
  const getTimerStyle = (): React.CSSProperties => {
    switch (selectedTimerDesign) {
      case 'neon':
        return { color: '#00ffff', textShadow: `${baseTextShadow}, 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff`, fontWeight: '600' }
      case 'neon-pink':
        return { color: '#ff1493', textShadow: `${baseTextShadow}, 0 0 20px #ff1493, 0 0 40px #ff1493, 0 0 60px #ff1493`, fontWeight: '600' }
      case 'retro':
        return { color: '#ff0080', textShadow: `${baseTextShadow}, 3px 3px 0px #00ffff, 6px 6px 0px #ff00ff`, fontWeight: '600' }
      case 'cyber':
        return { color: '#00ff00', textShadow: `${baseTextShadow}, 0 0 10px #00ff00, 0 0 20px #00ff00`, fontFamily: 'monospace', fontWeight: '600' }
      case 'gold':
        return { color: '#ffd700', textShadow: `${baseTextShadow}, 0 0 20px #ffd700, 0 0 40px #b8860b`, fontWeight: '600' }
      case 'glassmorphism':
        return { color: 'rgba(255,255,255,0.95)', textShadow: baseTextShadow, fontWeight: '500' }
      case 'holographic':
        return { background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '400% 400%', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))', fontWeight: '600' }
      case 'led-display':
        return { color: '#00ff00', textShadow: `${baseTextShadow}, 0 0 10px #00ff00`, fontFamily: 'monospace', letterSpacing: '0.1em', fontWeight: '600' }
      case 'matrix-code':
        return { color: '#00ff00', textShadow: `${baseTextShadow}, 0 0 15px #00ff00, 0 0 30px #003300`, fontFamily: 'monospace', fontWeight: '600' }
      case 'massive':
        return { color: '#ffffff', fontSize: '12rem', textShadow: baseTextShadow, fontWeight: '600' }
      case 'minimal':
        return { color: '#ffffff', fontWeight: '300', letterSpacing: '0.2em', textShadow: baseTextShadow }
      default:
        return { color: '#ffffff', textShadow: baseTextShadow, fontWeight: '600' }
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-black">
      {/* Background */}
      {currentThemeData.isVideo ? (
        <video
          key={currentTheme}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={currentThemeData.image} type="video/mp4" />
        </video>
      ) : currentThemeData.isGradient ? (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ background: currentThemeData.gradient }}
        />
      ) : (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${currentThemeData.image})` }}
        />
      )}

      {/* Dark overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Snow Effect - Falls with sideways wind drift */}
      {snowEnabled && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {snowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute rounded-full bg-white animate-snow"
              style={{
                left: `${flake.left}%`,
                top: 0,
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                opacity: flake.opacity,
                animationDuration: `${flake.duration}s`,
                animationDelay: `${flake.delay}s`,
                filter: flake.blur ? 'blur(0.5px)' : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* Rain Effect - slimmer, longer, realistic */}
      {rainEnabled && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {[...Array(150)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-gradient-to-b from-blue-300/60 to-blue-100/20 animate-rain"
              style={{
                left: `${Math.random() * 100}%`,
                width: '1px',
                height: `${15 + Math.random() * 25}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${0.8 + Math.random() * 0.6}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Top Left - Logo & Controls (hidden in fullscreen) */}
      {!isFullscreen && (
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-white font-bold text-2xl tracking-wide">BME</span>
          </div>
                  </div>
      )}

      {/* Top Right - Clock (hidden in fullscreen) */}
      {!isFullscreen && (
        <div className="absolute top-4 right-4 z-20 text-right">
          <div className="text-white text-4xl font-light tracking-wider">
            {formatClock(currentTime)}
          </div>
          <div className="text-white/70 text-sm">
            {formatDate(currentTime)}
          </div>
        </div>
      )}

      {/* Center - Timer Display */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center">
          {/* Mode label - above timer like reference */}
          {!isFullscreen && (
            <div 
              className="text-white text-lg mb-3 tracking-wide"
              style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
            >
              {mode === 'focus' ? 'Focusing' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </div>
          )}
          <div 
            className={`tracking-tight transition-opacity ${isFullscreen ? 'text-[14rem] cursor-default' : 'text-8xl md:text-[10rem] cursor-pointer hover:opacity-80'} ${selectedTimerDesign === 'massive' ? 'text-[12rem]' : ''}`}
            style={getTimerStyle()}
            onClick={() => !isFullscreen && setShowTimerPanel(true)}
          >
            {formatTime(timeLeft)}
          </div>
          {/* Focus Title - below timer */}
          {focusTitle && !isFullscreen && (
            <div 
              className="text-white/70 text-sm mt-4 tracking-wide"
              style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
            >
              {focusTitle}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Toolbar (hidden in fullscreen) */}
      {!isFullscreen && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/10">
            {/* Background Themes */}
            <button
              onClick={() => { closeAllPanels(); setShowThemesPanel(true) }}
              className={`p-3 rounded-xl transition-all ${showThemesPanel ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Background Themes"
            >
              <Image className="w-5 h-5" />
            </button>

            {/* Sounds */}
            <button
              onClick={() => { closeAllPanels(); setShowSoundsPanel(true) }}
              className={`p-3 rounded-xl transition-all ${showSoundsPanel ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Ambient Sounds"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Timer Settings */}
            <button
              onClick={() => { closeAllPanels(); setShowTimerPanel(true) }}
              className={`p-3 rounded-xl transition-all ${showTimerPanel ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Timer Settings"
            >
              <Timer className="w-5 h-5" />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/20 mx-2" />

            {/* Play/Pause */}
            <button
              onClick={toggleTimer}
              className="p-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all"
              title={isRunning ? 'Pause' : 'Start'}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Reset */}
            <button
              onClick={resetTimer}
              className="p-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              title="Reset Timer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/20 mx-2" />

            {/* Clock Design */}
            <button
              onClick={() => { closeAllPanels(); setShowClockDesignPanel(true) }}
              className={`p-3 rounded-xl transition-all ${showClockDesignPanel ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Clock Design"
            >
              <Clock className="w-5 h-5" />
            </button>

            {/* Music/Spotify */}
            <button
              onClick={() => { closeAllPanels(); setShowSpotifyPanel(true) }}
              className={`p-3 rounded-xl transition-all ${showSpotifyPanel ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Spotify"
            >
              <Music className="w-5 h-5" />
            </button>

            {/* Tasks */}
            <button
              className="p-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              title="Tasks"
            >
              <ListTodo className="w-5 h-5" />
            </button>

            {/* Stats */}
            <button
              className="p-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              title="Statistics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Exit Button - subtle side button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-6 right-6 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all backdrop-blur-sm"
          title="Exit Fullscreen"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      {/* Sounds Panel */}
      {showSoundsPanel && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10 min-w-[400px]">
            {/* Tabs */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <button
                onClick={() => setShowAnimationsTab(false)}
                className={`text-sm font-medium pb-2 border-b-2 transition-all ${!showAnimationsTab ? 'text-white border-white' : 'text-white/50 border-transparent'}`}
              >
                Sounds
              </button>
              <button
                onClick={() => setShowAnimationsTab(true)}
                className={`text-sm font-medium pb-2 border-b-2 transition-all ${showAnimationsTab ? 'text-white border-white' : 'text-white/50 border-transparent'}`}
              >
                Animations
              </button>
            </div>

            {!showAnimationsTab ? (
              <>
                <h3 className="text-white font-semibold mb-4">Sounds</h3>
                <div className="grid grid-cols-3 gap-3">
                  {sounds.map(sound => (
                    <button
                      key={sound.id}
                      onClick={() => toggleSound(sound.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                        activeSounds[sound.id] 
                          ? 'bg-amber-500/20 border border-amber-500/50' 
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <span className="text-2xl">{sound.icon}</span>
                      <span className="text-white/70 text-xs">{sound.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-white font-semibold mb-4">Animations</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>Rain</span>
                      <Cloud className="w-4 h-4 text-white/50" />
                    </div>
                    <button
                      onClick={() => setRainEnabled(!rainEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${rainEnabled ? 'bg-amber-500' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${rainEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>Snow</span>
                      <Snowflake className="w-4 h-4 text-white/50" />
                    </div>
                    <button
                      onClick={() => setSnowEnabled(!snowEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors ${snowEnabled ? 'bg-amber-500' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${snowEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setRainEnabled(false); setSnowEnabled(false) }}
                  className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                  Reset All
                </button>
              </>
            )}

            {/* Close button */}
            <button
              onClick={() => setShowSoundsPanel(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Themes Panel */}
      {showThemesPanel && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-3 border border-white/10 max-w-4xl w-full mx-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white text-sm font-semibold">Themes</h3>
              <button
                onClick={() => setShowThemesPanel(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Categories */}
            <div className="flex gap-2 mb-3">
              <button 
                onClick={() => setThemeTab('static')}
                className={`px-2 py-1 rounded text-xs transition-all ${themeTab === 'static' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Static ({staticThemes.length})
              </button>
              <button 
                onClick={() => setThemeTab('live')}
                className={`px-2 py-1 rounded text-xs transition-all ${themeTab === 'live' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Live ({liveThemes.length})
              </button>
              <button 
                onClick={() => setThemeTab('colors')}
                className={`px-2 py-1 rounded text-xs transition-all ${themeTab === 'colors' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Colors ({colorThemes.length})
              </button>
            </div>

            {/* Theme Grid - Ultra compact layout to fit all without scrolling */}
            <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-11 gap-1.5">
              {(themeTab === 'static' ? staticThemes : themeTab === 'live' ? liveThemes : colorThemes).map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { setCurrentTheme(theme.id); setShowThemesPanel(false) }}
                  className={`relative w-full h-12 sm:h-14 rounded-md overflow-hidden border-2 transition-all ${
                    currentTheme === theme.id ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-transparent hover:border-white/30'
                  }`}
                  title={theme.name}
                >
                  {theme.isVideo ? (
                    <video
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                    >
                      <source src={theme.image} type="video/mp4" />
                    </video>
                  ) : theme.isGradient ? (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: theme.gradient }}
                    >
                      <span className="text-sm">{theme.emoji}</span>
                    </div>
                  ) : (
                    <img
                      src={theme.image}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timer Settings Panel */}
      {showTimerPanel && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10 min-w-[350px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Pomodoro</h3>
              <button
                onClick={() => setShowTimerPanel(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => changeMode('focus')}
                className={`text-sm ${mode === 'focus' ? 'text-amber-400' : 'text-white/50'}`}
              >
                Focus
              </button>
              <button
                onClick={() => changeMode('shortBreak')}
                className={`text-sm ${mode === 'shortBreak' ? 'text-amber-400' : 'text-white/50'}`}
              >
                Short Break
              </button>
              <button
                onClick={() => changeMode('longBreak')}
                className={`text-sm ${mode === 'longBreak' ? 'text-amber-400' : 'text-white/50'}`}
              >
                Long Break
              </button>
            </div>

            {/* Focus Title Input */}
            <input
              type="text"
              placeholder="Click to add focus title"
              value={focusTitle}
              onChange={(e) => setFocusTitle(e.target.value)}
              className="w-full bg-transparent text-white/70 text-center text-sm mb-6 outline-none border-b border-white/20 pb-2"
            />

            {/* Duration Settings */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Focus Duration</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setFocusDuration(Math.max(1, focusDuration - 5)); if (mode === 'focus') setTimeLeft(Math.max(1, focusDuration - 5) * 60) }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={focusDuration}
                    onChange={(e) => { const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 1)); setFocusDuration(val); if (mode === 'focus') setTimeLeft(val * 60) }}
                    className="w-16 text-center bg-white/10 text-white rounded-lg py-1 outline-none"
                  />
                  <button
                    onClick={() => { setFocusDuration(Math.min(120, focusDuration + 5)); if (mode === 'focus') setTimeLeft(Math.min(120, focusDuration + 5) * 60) }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-white/50 text-sm">min</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Short Break</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShortBreakDuration(Math.max(1, shortBreakDuration - 1)); if (mode === 'shortBreak') setTimeLeft(Math.max(1, shortBreakDuration - 1) * 60) }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={shortBreakDuration}
                    onChange={(e) => { const val = Math.max(1, Math.min(30, parseInt(e.target.value) || 1)); setShortBreakDuration(val); if (mode === 'shortBreak') setTimeLeft(val * 60) }}
                    className="w-16 text-center bg-white/10 text-white rounded-lg py-1 outline-none"
                  />
                  <button
                    onClick={() => { setShortBreakDuration(Math.min(30, shortBreakDuration + 1)); if (mode === 'shortBreak') setTimeLeft(Math.min(30, shortBreakDuration + 1) * 60) }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-white/50 text-sm">min</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Long Break</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setLongBreakDuration(Math.max(1, longBreakDuration - 5)); if (mode === 'longBreak') setTimeLeft(Math.max(1, longBreakDuration - 5) * 60) }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={longBreakDuration}
                    onChange={(e) => { const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 1)); setLongBreakDuration(val); if (mode === 'longBreak') setTimeLeft(val * 60) }}
                    className="w-16 text-center bg-white/10 text-white rounded-lg py-1 outline-none"
                  />
                  <button
                    onClick={() => { setLongBreakDuration(Math.min(60, longBreakDuration + 5)); if (mode === 'longBreak') setTimeLeft(Math.min(60, longBreakDuration + 5) * 60) }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-white/50 text-sm">min</span>
                </div>
              </div>
            </div>

            {/* Current Timer Display */}
            <div className="text-center mb-6 p-4 bg-white/5 rounded-xl">
              <div className="text-white/50 text-xs mb-1">Current Timer</div>
              <div className="text-white text-4xl font-light tracking-wider">
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={() => { toggleTimer(); setShowTimerPanel(false) }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
            >
              {isRunning ? 'Pause Timer' : 'Start Timer'}
            </button>
          </div>
        </div>
      )}

      {/* Clock Design Panel */}
      {showClockDesignPanel && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10 min-w-[450px] max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Clock Design</h3>
              <button
                onClick={() => setShowClockDesignPanel(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {timerDesigns.map(design => (
                <button
                  key={design.id}
                  onClick={() => { setSelectedTimerDesign(design.id); setShowClockDesignPanel(false) }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                    selectedTimerDesign === design.id 
                      ? 'bg-amber-500/20 border border-amber-500/50' 
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <span className="text-2xl">{design.emoji}</span>
                  <span className="text-white text-xs font-medium">{design.name}</span>
                  <span className="text-white/50 text-[10px]">{design.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spotify Player - visible in fullscreen but very transparent */}
      {selectedSpotifyPlaylist && !showSpotifyPanel && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isFullscreen 
            ? 'top-4 right-4 opacity-5 hover:opacity-100' 
            : '-left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden'
        }`}>
          <iframe
            src={`https://open.spotify.com/embed/playlist/${selectedSpotifyPlaylist}?utm_source=generator&theme=0`}
            width="300"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="rounded-xl"
          />
        </div>
      )}

      {/* Spotify Panel - Simple Playlist Embed */}
      {showSpotifyPanel && (
        <div className="absolute top-20 right-4 z-30">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 w-[380px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="text-white font-semibold">Spotify</span>
                {selectedSpotifyPlaylist && (
                  <span className="text-green-500 text-xs">● Playing</span>
                )}
              </div>
              <button
                onClick={() => setShowSpotifyPanel(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Player or Playlist Selection */}
            {selectedSpotifyPlaylist ? (
              <div className="p-4">
                <button 
                  onClick={() => setSelectedSpotifyPlaylist(null)}
                  className="text-white/50 hover:text-white text-sm mb-3 flex items-center gap-1"
                >
                  ← Back to playlists
                </button>
                <iframe
                  src={`https://open.spotify.com/embed/playlist/${selectedSpotifyPlaylist}?utm_source=generator&theme=0`}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                />
                <div className="mt-3 space-y-2">
                  <p className="text-white/40 text-xs text-center">
                    💡 If you see "Get Spotify", you need to log into Spotify in your browser
                  </p>
                  <a
                    href={`https://open.spotify.com/playlist/${selectedSpotifyPlaylist}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-white/50 hover:text-white text-xs transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open in Spotify app
                  </a>
                  <p className="text-white/40 text-xs text-center">
                    Music will keep playing in fullscreen mode
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Add Custom Playlist */}
                <div className="mb-4">
                  <div className="text-white/70 text-sm mb-2">Add Your Playlist</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customPlaylistUrl}
                      onChange={(e) => setCustomPlaylistUrl(e.target.value)}
                      placeholder="Paste Spotify playlist URL or ID"
                      className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/50 placeholder:text-white/30"
                    />
                    <button
                      onClick={() => {
                        // Extract playlist ID from URL or use as-is
                        let playlistId = customPlaylistUrl.trim()
                        if (playlistId.includes('spotify.com/playlist/')) {
                          playlistId = playlistId.split('playlist/')[1].split('?')[0]
                        }
                        if (playlistId) {
                          setSelectedSpotifyPlaylist(playlistId)
                          setCustomPlaylistUrl('')
                        }
                      }}
                      className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black text-sm font-medium rounded-lg transition-colors"
                    >
                      Play
                    </button>
                  </div>
                  <p className="text-white/30 text-xs mt-1">
                    e.g. https://open.spotify.com/playlist/37i9dQZF1DX...
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="text-white/70 text-sm mb-3">Suggested Playlists</div>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {spotifyPlaylists.map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => setSelectedSpotifyPlaylist(playlist.id)}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center text-2xl">
                          {playlist.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium">{playlist.name}</div>
                          <div className="text-white/50 text-xs">{playlist.description}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-white/30" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close panels */}
      {(showSoundsPanel || showTimerPanel || showClockDesignPanel || showSpotifyPanel) && (
        <div 
          className="absolute inset-0 z-20"
          onClick={closeAllPanels}
        />
      )}
    </div>
  )
}
