import React, { useEffect, useRef } from 'react';
import { GameState, BlobEntity, FoodEntity, LeaderboardEntry } from '../types';
import { WORLD_WIDTH, WORLD_HEIGHT, INITIAL_PLAYER_RADIUS, FOOD_RADIUS, MAX_FOOD, MAX_BOTS, getRandomColor, BOT_NAMES } from '../constants';

interface GameCanvasProps {
  nickname: string;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setKillerName: (name: string) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ nickname, setGameState, setScore, setLeaderboard, setKillerName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state Refs (mutable to avoid re-renders in game loop)
  const playerRef = useRef<BlobEntity>({
    id: 'player',
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: INITIAL_PLAYER_RADIUS,
    color: '#FFFFFF',
    name: nickname,
    isPlayer: true,
  });
  
  const botsRef = useRef<BlobEntity[]>([]);
  const foodsRef = useRef<FoodEntity[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef<number>(0);
  const lastLeaderboardUpdateRef = useRef<number>(0);

  // Initialize game entities
  useEffect(() => {
    // Reset player
    playerRef.current = {
      id: 'player',
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: INITIAL_PLAYER_RADIUS,
      color: '#3b82f6', // Player is blue-ish
      name: nickname,
      isPlayer: true,
    };

    // Generate bots
    botsRef.current = Array.from({ length: MAX_BOTS }).map((_, i) => ({
      id: `bot-${i}`,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: Math.max(10, Math.random() * 50), // Random starting sizes
      color: getRandomColor(),
      name: BOT_NAMES[i % BOT_NAMES.length],
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
    }));

    // Generate food
    foodsRef.current = Array.from({ length: MAX_FOOD }).map((_, i) => ({
      id: `food-${i}`,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: FOOD_RADIUS,
      color: getRandomColor(),
    }));

    setScore(INITIAL_PLAYER_RADIUS);
  }, [nickname, setScore]);

  // Mouse handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Calculate mouse position relative to center of screen (0,0 is center)
      mouseRef.current = {
        x: e.clientX - rect.left - canvas.width / 2,
        y: e.clientY - rect.top - canvas.height / 2,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const update = () => {
      if (!playerRef.current) return;

      const player = playerRef.current;

      // --- 1. Update Player Position ---
      // Calculate velocity based on mouse distance
      // Slower when bigger
      const speed = 200 / player.radius + 2; 
      const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
      
      // Only move if mouse is somewhat far from center to prevent jitter
      const distMouse = Math.hypot(mouseRef.current.x, mouseRef.current.y);
      if (distMouse > 5) {
          player.x += Math.cos(angle) * speed;
          player.y += Math.sin(angle) * speed;
      }

      // Boundaries
      player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));

      // --- 2. Update Bots ---
      botsRef.current.forEach(bot => {
        // Simple AI: Wander with some random direction changes
        if (Math.random() < 0.02) {
          bot.dx = (Math.random() - 0.5) * 4;
          bot.dy = (Math.random() - 0.5) * 4;
        }

        // Helper to check boundaries and bounce
        if (bot.x - bot.radius < 0 || bot.x + bot.radius > WORLD_WIDTH) bot.dx = - (bot.dx || 1);
        if (bot.y - bot.radius < 0 || bot.y + bot.radius > WORLD_HEIGHT) bot.dy = - (bot.dy || 1);
        
        // Speed adjustment by size
        const botSpeed = (200 / bot.radius + 1.5) * 0.5; 
        
        // Normalize vector
        const mag = Math.hypot(bot.dx || 0, bot.dy || 0);
        const vx = (bot.dx || 0) / (mag || 1) * botSpeed;
        const vy = (bot.dy || 0) / (mag || 1) * botSpeed;

        bot.x += vx;
        bot.y += vy;

        // Hard boundary clamp
        bot.x = Math.max(bot.radius, Math.min(WORLD_WIDTH - bot.radius, bot.x));
        bot.y = Math.max(bot.radius, Math.min(WORLD_HEIGHT - bot.radius, bot.y));
      });

      // --- 3. Collision Detection (Eating) ---
      
      // Helper: Area calc
      const getArea = (r: number) => Math.PI * r * r;
      const getRadius = (area: number) => Math.sqrt(area / Math.PI);

      // Player eats Food
      foodsRef.current = foodsRef.current.filter(food => {
        const dist = Math.hypot(player.x - food.x, player.y - food.y);
        if (dist < player.radius) {
          // Grow
          const newArea = getArea(player.radius) + getArea(food.radius);
          player.radius = getRadius(newArea);
          setScore(Math.floor(player.radius)); // Sync score for UI sometimes
          return false; // Remove food
        }
        return true;
      });

      // Replenish Food
      while (foodsRef.current.length < MAX_FOOD) {
        foodsRef.current.push({
          id: `food-new-${Date.now()}-${Math.random()}`,
          x: Math.random() * WORLD_WIDTH,
          y: Math.random() * WORLD_HEIGHT,
          radius: FOOD_RADIUS,
          color: getRandomColor(),
        });
      }

      // Bot vs Player Interaction
      let playerDied = false;
      
      // Sort entities by size for layered rendering later, but here for logic
      // Check Player vs Bots
      botsRef.current = botsRef.current.filter(bot => {
        if (playerDied) return true;

        const dist = Math.hypot(player.x - bot.x, player.y - bot.y);
        const overlap = dist < Math.max(player.radius, bot.radius);
        
        if (overlap) {
            // Rule: Must be 10% bigger to eat
            if (player.radius > bot.radius * 1.1) {
                // Player eats bot
                const newArea = getArea(player.radius) + getArea(bot.radius);
                player.radius = getRadius(newArea);
                setScore(Math.floor(player.radius));
                return false; // Bot dies
            } else if (bot.radius > player.radius * 1.1) {
                // Bot eats player
                playerDied = true;
                setKillerName(bot.name || 'Unknown Cell');
                setGameState(GameState.GAME_OVER);
                return true;
            }
        }
        return true;
      });

      // Replenish Bots
       while (botsRef.current.length < MAX_BOTS) {
         botsRef.current.push({
            id: `bot-new-${Date.now()}`,
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            radius: Math.max(10, Math.random() * (player.radius * 1.5)), // Spawn some threatening ones
            color: getRandomColor(),
            name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
         });
       }

      // Update Leaderboard periodically
      if (Date.now() - lastLeaderboardUpdateRef.current > 1000) {
        const allEntities = [...botsRef.current, player].map(e => ({
            id: e.id,
            name: e.name || 'Cell',
            score: Math.floor(e.radius)
        }));
        allEntities.sort((a, b) => b.score - a.score);
        setLeaderboard(allEntities.slice(0, 5));
        lastLeaderboardUpdateRef.current = Date.now();
      }
    };

    const draw = () => {
      const player = playerRef.current;
      
      // Clear background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera Transform
      // We want the player in the center of the screen.
      // Calculate zoom level based on player size
      // Smooth zoom: starts at 1, decreases as radius increases
      const zoom = Math.max(0.1, 1 / (Math.pow(player.radius, 0.4) / 3)); 
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-player.x, -player.y);

      // Draw Grid (Optional visual aid)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= WORLD_WIDTH; x += 100) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
      }
      for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
      }
      ctx.stroke();

      // Draw World Border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Draw Food
      foodsRef.current.forEach(food => {
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw All Blobs (Player + Bots) sorted by size so small ones are under big ones
      const allBlobs = [...botsRef.current, player].sort((a, b) => a.radius - b.radius);

      allBlobs.forEach(blob => {
        ctx.fillStyle = blob.color;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Stroke for definition
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Name
        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${Math.max(12, blob.radius * 0.4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(blob.name || '', blob.x, blob.y);
      });

      ctx.restore();
    };

    const renderLoop = () => {
      update();
      draw();
      frameIdRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nickname, setGameState, setScore, setLeaderboard, setKillerName]);

  return <canvas ref={canvasRef} className="block w-full h-full touch-none cursor-crosshair" />;
};

export default GameCanvas;