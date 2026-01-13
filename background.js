/**
 * 3D Particle Background Animation
 * Lightweight Canvas-based particle system
 */

class ParticleBackground {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        
        // Configuration
        this.config = {
            particleCount: this.isMobile() ? 25 : 80,
            minSize: 2,
            maxSize: 4,
            speed: 0.3,
            connectDistance: 120,
            colors: ['#FF6B35', '#004E89', '#06D6A0', '#F77F00'],
            mouseInfluence: 30
        };
        
        this.init();
    }
    
    isMobile() {
        return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
    
    init() {
        this.resize();
        this.createParticles();
        this.addEventListeners();
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push(new Particle(this));
        }
    }
    
    addEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createParticles();
        });
        
        if (!this.isMobile()) {
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.x;
                this.mouse.y = e.y;
            });
            
            window.addEventListener('mouseout', () => {
                this.mouse.x = null;
                this.mouse.y = null;
            });
        }
        
        // Pause when tab is inactive
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.paused = true;
            } else {
                this.paused = false;
                this.animate();
            }
        });
    }
    
    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.connectDistance) {
                    const opacity = (1 - distance / this.config.connectDistance) * 0.3;
                    this.ctx.strokeStyle = `rgba(255, 107, 53, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    animate() {
        if (this.paused) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw particles
        this.particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw connections
        this.drawConnections();
        
        requestAnimationFrame(() => this.animate());
    }
}

class Particle {
    constructor(background) {
        this.bg = background;
        this.reset();
        this.x = Math.random() * this.bg.canvas.width;
        this.y = Math.random() * this.bg.canvas.height;
    }
    
    reset() {
        this.size = Math.random() * (this.bg.config.maxSize - this.bg.config.minSize) + this.bg.config.minSize;
        this.speedX = (Math.random() - 0.5) * this.bg.config.speed;
        this.speedY = (Math.random() - 0.5) * this.bg.config.speed;
        this.color = this.bg.config.colors[Math.floor(Math.random() * this.bg.config.colors.length)];
        this.opacity = Math.random() * 0.5 + 0.3;
        this.layer = Math.floor(Math.random() * 3); // Depth layer
        this.pulseSpeed = 0.01 + Math.random() * 0.01;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    
    update() {
        // Mouse interaction
        if (this.bg.mouse.x != null && !this.bg.isMobile()) {
            const dx = this.bg.mouse.x - this.x;
            const dy = this.bg.mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.bg.mouse.radius) {
                const force = (this.bg.mouse.radius - distance) / this.bg.mouse.radius;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * force * (this.bg.config.mouseInfluence / 10);
                this.y += Math.sin(angle) * force * (this.bg.config.mouseInfluence / 10);
            }
        }
        
        // Movement
        this.x += this.speedX * (this.layer + 1);
        this.y += this.speedY * (this.layer + 1);
        
        // Opacity pulse
        this.pulsePhase += this.pulseSpeed;
        this.opacity = 0.3 + Math.sin(this.pulsePhase) * 0.3;
        
        // Boundary check with wraparound
        if (this.x < -10) this.x = this.bg.canvas.width + 10;
        if (this.x > this.bg.canvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = this.bg.canvas.height + 10;
        if (this.y > this.bg.canvas.height + 10) this.y = -10;
    }
    
    draw() {
        this.bg.ctx.save();
        
        // Glow effect
        this.bg.ctx.shadowBlur = 15;
        this.bg.ctx.shadowColor = this.color;
        
        // Draw particle
        this.bg.ctx.globalAlpha = this.opacity;
        this.bg.ctx.fillStyle = this.color;
        this.bg.ctx.beginPath();
        this.bg.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.bg.ctx.fill();
        
        this.bg.ctx.restore();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParticleBackground();
});
