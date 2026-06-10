import React, { useEffect, useRef } from 'react';

export const CursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      alpha: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 50;
    const mouse = { x: -100, y: -100 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Generate trailing particles
      for (let i = 0; i < 2; i++) {
        if (particles.length < maxParticles) {
          const size = Math.random() * 2.5 + 1;
          const hues = [35, 20, 45, 15]; // Sunset gold, deep orange, warm amber, coral
          const hue = hues[Math.floor(Math.random() * hues.length)];
          particles.push({
            x: mouse.x,
            y: mouse.y,
            size,
            color: `hsla(${hue}, 100%, 60%, `,
            speedX: (Math.random() - 0.5) * 1.4,
            speedY: (Math.random() - 0.5) * 1.4 - 0.15, // slight drift up
            alpha: 0.75
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw pointer halo glow
      if (mouse.x > 0 && mouse.y > 0) {
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 80);
        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.04)'); // soft amber
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw particle nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha -= 0.014;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + `${p.alpha})`;
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99] w-full h-full"
    />
  );
};
export default CursorTrail;
