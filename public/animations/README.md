# Animated Backgrounds System

This directory contains CSS and JavaScript files for creating beautiful animated backgrounds in the Focus Timer.

## 🎨 **Available Animations**

### Weather Effects
- **Rain** 🌧️ - Gentle falling rain for peaceful focus
- **Snow** ❄️ - Calming snowflakes for winter vibes
- **Thunderstorm** ⛈️ - Dramatic storm for intense focus

### Space & Cosmic
- **Galaxy** 🌌 - Twinkling stars in deep space
- **Aurora** 🌌 - Magical northern lights

### Nature
- **Ocean Waves** 🌊 - Rhythmic ocean movement
- **Forest Breeze** 🍃 - Falling leaves in the forest
- **Underwater Bubbles** 🐠 - Peaceful underwater with rising bubbles
- **Sunset Clouds** 🌅 - Beautiful sunset with floating clouds

### Abstract
- **Floating Particles** ✨ - Gentle floating particles
- **Geometric Flow** 🔷 - Rotating geometric patterns
- **Warm Fire** 🔥 - Flickering flames for warmth
- **Mystical Smoke** 💨 - Rising smoke clouds
- **Magical Sparkles** ✨ - Twinkling magical sparkles
- **Lava Flow** 🌋 - Molten lava with bubbling effects

### Cyberpunk & Digital
- **Matrix Rain** 💚 - Digital code falling like rain
- **Neon City** 🌃 - Cyberpunk city with neon lights
- **Digital Glitch** ⚡ - Retro digital glitch effects
- **Cyberpunk Grid** 🔮 - Futuristic grid with glowing nodes

### Video Backgrounds
- **Cosmic Journey** 🌌 - Mesmerizing cosmic video background
- **Ocean Depths** 🌊 - Deep ocean video with flowing water
- **Forest Serenity** 🌲 - Peaceful forest video background
- **Mountain Vista** ⛰️ - Majestic mountain landscape video
- **Urban Lights** 🏙️ - Dynamic city lights video
- **Abstract Flow** 🎨 - Flowing abstract video patterns
- **Desert Sunset** 🏜️ - Warm desert sunset video
- **Digital Waves** 💫 - Futuristic digital wave patterns

## 🚀 **How It Works**

1. **CSS Animations**: Pure CSS keyframes for smooth, lightweight animations
2. **JavaScript Generation**: Dynamic element creation for complex effects
3. **Video Backgrounds**: HTML5 video elements with autoplay and loop
4. **Performance Optimized**: Uses CSS transforms and opacity for smooth 60fps
5. **Responsive**: Adapts to any screen size

## 📁 **File Structure**

```
public/
├── animations/
│   ├── animated-backgrounds.css    # All CSS animations and styles
│   ├── animated-backgrounds.js     # JavaScript for dynamic elements
│   └── README.md                   # This file
└── ambient-themes/
    └── animated/
        ├── 204241-923909574_small.mp4  # Cosmic Journey
        ├── 208106_small.mp4            # Ocean Depths
        ├── 208812_small.mp4            # Forest Serenity
        ├── 209204_large.mp4            # Mountain Vista
        ├── 270983.mp4                  # Urban Lights
        ├── 276498_small.mp4            # Abstract Flow
        ├── 297736_small.mp4            # Desert Sunset
        └── 301247_small.mp4            # Digital Waves
```

## 🔧 **Technical Details**

### CSS Classes
Each animation has a corresponding CSS class:
- `.rain-background` - Rain animation
- `.snow-background` - Snow animation
- `.galaxy-background` - Galaxy animation
- etc.

### JavaScript Class
```javascript
new AnimatedBackground(container, animationType)
```

### Performance Features
- Hardware-accelerated CSS transforms
- Optimized animation timing
- Memory-efficient element management
- Automatic cleanup on theme change

## 🎯 **Usage in React**

```typescript
// Initialize animation
const initializeAnimation = (animationType: string) => {
  if (currentAnimation) {
    currentAnimation.destroy()
  }
  
  if (animationRef.current && window.AnimatedBackground) {
    const animation = new window.AnimatedBackground(animationRef.current, animationType)
    setCurrentAnimation(animation)
  }
}
```

## 🌟 **Customization**

You can easily customize animations by:
1. Modifying CSS keyframes in `animated-backgrounds.css`
2. Adjusting JavaScript parameters in `animated-backgrounds.js`
3. Adding new animation types following the existing pattern

## 📱 **Browser Support**

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

All animations use modern CSS features with fallbacks for older browsers.
