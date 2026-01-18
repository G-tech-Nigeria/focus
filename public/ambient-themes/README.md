# Ambient Themes for Focus Timer

This folder contains ambient background themes for the Focus Timer application.

## 📁 Folder Structure

```
ambient-themes/
├── static/          # Static background images
├── animated/        # Animated backgrounds (GIFs, videos)
└── README.md        # This file
```

## 🎨 Adding New Themes

### Static Themes
1. Add your image files to the `static/` folder
2. Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`
3. Recommended resolution: 1920x1080 or higher
4. File naming: Use descriptive names like `rainy-cafe.jpg`, `forest-retreat.png`

### Animated Themes
1. Add your animated files to the `animated/` folder
2. Supported formats: `.gif`, `.mp4`, `.webm`
3. Recommended resolution: 1920x1080 or higher
4. File naming: Use descriptive names like `flickering-fireplace.gif`, `rainy-cafe.mp4`

## 🏷️ Theme Categories

### Cozy Indoor
- Rainy Lofi Cafe
- Cozy Fireplace
- Library Study Room
- Coffee Shop Interior

### Nature & Forest
- Forest Retreat
- Toto Forest
- Countryside Morning
- Mountain Peaks

### Sky & Atmosphere
- Cotton Candy Sky
- Lofi Clouds
- Dusk Peak
- Countryside Night

### Water & Underwater
- Underwater Reef
- Ocean Waves
- Rainy Day
- Waterfall

### Urban & City
- City Lights
- Urban Night
- Street Cafe
- Modern Office

## 🔧 Implementation

Themes are automatically loaded and can be selected in the Focus Timer settings under "Themes" > "Ambient Theme".

## 📝 Naming Convention

Use kebab-case for file names:
- `rainy-lofi-cafe.jpg`
- `flickering-fireplace.gif`
- `forest-retreat.png`
- `cotton-candy-sky.mp4`

## 🎯 Tips for Best Results

1. **High Resolution**: Use at least 1920x1080 for crisp display
2. **Optimize File Size**: Compress images for faster loading
3. **Consistent Style**: Choose themes that match the app's aesthetic
4. **Test Performance**: Ensure animated themes don't impact performance
5. **Mobile Friendly**: Consider how themes look on smaller screens

## 🚀 Adding Themes to Code

After adding files, update the `ambientThemes` array in `FocusTimerPage.tsx`:

```typescript
const ambientThemes = [
  {
    id: 'rainy-cafe',
    name: 'Rainy Lofi Cafe',
    type: 'static',
    file: 'rainy-cafe.jpg',
    description: 'Cozy cafe with rain outside',
    emoji: '☕'
  },
  // ... more themes
]
```

Happy theming! 🎨✨


