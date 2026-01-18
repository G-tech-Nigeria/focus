// Animated Backgrounds JavaScript

// Prevent duplicate class declaration
if (typeof window !== 'undefined' && !window.AnimatedBackground) {
  class AnimatedBackground {
  constructor(container, type) {
    this.container = container;
    this.type = type;
    this.elements = [];
    this.init();
  }

  init() {
    this.container.classList.add(`${this.type}-background`);
    this.createElements();
    this.startAnimation();
  }

  createElements() {
    switch (this.type) {
      case 'rain':
        this.createRainDrops();
        break;
      case 'snow':
        this.createSnowFlakes();
        break;
      case 'galaxy':
        this.createStars();
        break;
      case 'forest':
        this.createLeaves();
        break;
      case 'particles':
        this.createParticles();
        break;
      case 'geometric':
        this.createGeometricShapes();
        break;
      case 'smoke':
        this.createSmokeClouds();
        break;
      case 'matrix':
        this.createMatrixRain();
        break;
      case 'neon':
        this.createNeonLights();
        break;
      case 'underwater':
        this.createBubbles();
        break;
      case 'glitch':
        this.createGlitchEffect();
        break;
      case 'sunset':
        this.createClouds();
        break;
      case 'cyberpunk':
        this.createCyberpunkGrid();
        break;
      case 'sparkles':
        this.createSparkles();
        break;
      case 'lava':
        this.createLavaFlow();
        break;
    }
  }

  createRainDrops() {
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain-drops';
    
    for (let i = 0; i < 100; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-drop';
      drop.style.left = Math.random() * 100 + '%';
      drop.style.animationDelay = Math.random() * 2 + 's';
      drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
      rainContainer.appendChild(drop);
    }
    
    this.container.appendChild(rainContainer);
    this.elements.push(rainContainer);
  }

  createSnowFlakes() {
    const snowContainer = document.createElement('div');
    snowContainer.className = 'snow-flakes';
    
    const snowflakeSymbols = ['❄', '❅', '❆', '✻', '✼', '✽', '✾', '✿'];
    
    for (let i = 0; i < 50; i++) {
      const flake = document.createElement('div');
      flake.className = 'snow-flake';
      flake.textContent = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];
      flake.style.left = Math.random() * 100 + '%';
      flake.style.animationDelay = Math.random() * 3 + 's';
      flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
      flake.style.fontSize = (Math.random() * 10 + 10) + 'px';
      snowContainer.appendChild(flake);
    }
    
    this.container.appendChild(snowContainer);
    this.elements.push(snowContainer);
  }

  createStars() {
    const starsContainer = document.createElement('div');
    starsContainer.className = 'galaxy-stars';
    
    for (let i = 0; i < 200; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.width = (Math.random() * 3 + 1) + 'px';
      star.style.height = star.style.width;
      star.style.animationDelay = Math.random() * 2 + 's';
      star.style.animationDuration = (Math.random() * 2 + 1) + 's';
      starsContainer.appendChild(star);
    }
    
    this.container.appendChild(starsContainer);
    this.elements.push(starsContainer);
  }

  createLeaves() {
    const leavesContainer = document.createElement('div');
    leavesContainer.className = 'forest-leaves';
    
    for (let i = 0; i < 30; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.style.left = Math.random() * 100 + '%';
      leaf.style.animationDelay = Math.random() * 4 + 's';
      leaf.style.animationDuration = (Math.random() * 2 + 3) + 's';
      leavesContainer.appendChild(leaf);
    }
    
    this.container.appendChild(leavesContainer);
    this.elements.push(leavesContainer);
  }

  createParticles() {
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
      this.container.appendChild(particle);
      this.elements.push(particle);
    }
  }

  createGeometricShapes() {
    for (let i = 0; i < 5; i++) {
      const shape = document.createElement('div');
      shape.className = 'geometric-shape';
      shape.style.animationDelay = Math.random() * 10 + 's';
      this.container.appendChild(shape);
      this.elements.push(shape);
    }
  }

  createSmokeClouds() {
    for (let i = 0; i < 3; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'smoke-cloud';
      cloud.style.left = Math.random() * 100 + '%';
      cloud.style.animationDelay = Math.random() * 8 + 's';
      cloud.style.animationDuration = (Math.random() * 4 + 6) + 's';
      this.container.appendChild(cloud);
      this.elements.push(cloud);
    }
  }

  createMatrixRain() {
    const matrixContainer = document.createElement('div');
    matrixContainer.className = 'matrix-rain';
    
    const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    for (let i = 0; i < 50; i++) {
      const column = document.createElement('div');
      column.className = 'matrix-column';
      column.style.left = Math.random() * 100 + '%';
      column.style.animationDelay = Math.random() * 3 + 's';
      column.style.animationDuration = (Math.random() * 2 + 2) + 's';
      
      let text = '';
      for (let j = 0; j < 20; j++) {
        text += characters[Math.floor(Math.random() * characters.length)] + '<br>';
      }
      column.innerHTML = text;
      
      matrixContainer.appendChild(column);
    }
    
    this.container.appendChild(matrixContainer);
    this.elements.push(matrixContainer);
  }

  createNeonLights() {
    const neonContainer = document.createElement('div');
    neonContainer.className = 'neon-buildings';
    
    for (let i = 0; i < 30; i++) {
      const light = document.createElement('div');
      light.className = 'neon-light';
      light.style.left = Math.random() * 100 + '%';
      light.style.bottom = Math.random() * 200 + 'px';
      light.style.animationDelay = Math.random() * 2 + 's';
      neonContainer.appendChild(light);
    }
    
    this.container.appendChild(neonContainer);
    this.elements.push(neonContainer);
  }

  createBubbles() {
    const bubblesContainer = document.createElement('div');
    bubblesContainer.className = 'bubbles';
    
    for (let i = 0; i < 40; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.style.left = Math.random() * 100 + '%';
      bubble.style.width = (Math.random() * 20 + 10) + 'px';
      bubble.style.height = bubble.style.width;
      bubble.style.animationDelay = Math.random() * 4 + 's';
      bubble.style.animationDuration = (Math.random() * 3 + 3) + 's';
      bubblesContainer.appendChild(bubble);
    }
    
    this.container.appendChild(bubblesContainer);
    this.elements.push(bubblesContainer);
  }

  createGlitchEffect() {
    const glitchContainer = document.createElement('div');
    glitchContainer.className = 'glitch-lines';
    this.container.appendChild(glitchContainer);
    this.elements.push(glitchContainer);
  }

  createClouds() {
    const cloudsContainer = document.createElement('div');
    cloudsContainer.className = 'clouds';
    
    for (let i = 0; i < 8; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud';
      cloud.style.top = Math.random() * 60 + '%';
      cloud.style.width = (Math.random() * 200 + 100) + 'px';
      cloud.style.height = (Math.random() * 100 + 50) + 'px';
      cloud.style.animationDelay = Math.random() * 20 + 's';
      cloud.style.animationDuration = (Math.random() * 10 + 15) + 's';
      cloudsContainer.appendChild(cloud);
    }
    
    this.container.appendChild(cloudsContainer);
    this.elements.push(cloudsContainer);
  }

  createCyberpunkGrid() {
    const gridContainer = document.createElement('div');
    gridContainer.className = 'cyber-grid';
    this.container.appendChild(gridContainer);
    this.elements.push(gridContainer);

    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'cyber-nodes';
    
    for (let i = 0; i < 25; i++) {
      const node = document.createElement('div');
      node.className = 'cyber-node';
      node.style.left = Math.random() * 100 + '%';
      node.style.top = Math.random() * 100 + '%';
      node.style.animationDelay = Math.random() * 2 + 's';
      nodesContainer.appendChild(node);
    }
    
    this.container.appendChild(nodesContainer);
    this.elements.push(nodesContainer);
  }

  createSparkles() {
    for (let i = 0; i < 60; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.left = Math.random() * 100 + '%';
      sparkle.style.top = Math.random() * 100 + '%';
      sparkle.style.animationDelay = Math.random() * 1.5 + 's';
      sparkle.style.animationDuration = (Math.random() * 1 + 1) + 's';
      this.container.appendChild(sparkle);
      this.elements.push(sparkle);
    }
  }

  createLavaFlow() {
    const lavaFlow = document.createElement('div');
    lavaFlow.className = 'lava-flow';
    this.container.appendChild(lavaFlow);
    this.elements.push(lavaFlow);

    const lavaBubbles = document.createElement('div');
    lavaBubbles.className = 'lava-bubbles';
    
    for (let i = 0; i < 15; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'lava-bubble';
      bubble.style.left = Math.random() * 100 + '%';
      bubble.style.animationDelay = Math.random() * 3 + 's';
      bubble.style.animationDuration = (Math.random() * 2 + 2) + 's';
      lavaBubbles.appendChild(bubble);
    }
    
    this.container.appendChild(lavaBubbles);
    this.elements.push(lavaBubbles);
  }

  startAnimation() {
    // Animation is handled by CSS
  }

  destroy() {
    this.elements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.container.classList.remove(`${this.type}-background`);
  }
}

  // Export for use in React components
  window.AnimatedBackground = AnimatedBackground;
}
