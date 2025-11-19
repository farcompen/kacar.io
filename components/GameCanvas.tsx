import React, { useEffect, useRef } from 'react';
import { GameState, BlobEntity, FoodEntity, LeaderboardEntry } from '../types';
import { 
  WORLD_WIDTH, 
  WORLD_HEIGHT, 
  INITIAL_PLAYER_RADIUS, 
  FOOD_RADIUS, 
  MAX_FOOD, 
  MAX_BOTS, 
  MIN_SPLIT_RADIUS,
  SPLIT_FORCE,
  getRandomColor, 
  BOT_NAMES 
} from '../constants';

interface GameCanvasProps {
  nickname: string;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setKillerName: (name: string) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ nickname, setGameState, setScore, setLeaderboard, setKillerName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state Refs
  // Player is now an array of blobs to support splitting
  const playerRef = useRef<BlobEntity[]>([]);
  
  const botsRef = useRef<BlobEntity[]>([]);
  const foodsRef = useRef<FoodEntity[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef<number>(0);
  const lastLeaderboardUpdateRef = useRef<number>(0);

  // Initialize game entities
  useEffect(() => {
    // Reset player with a single blob
    playerRef.current = [{
      id: 'player-init',
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: INITIAL_PLAYER_RADIUS,
      color: '#3b82f6', // Player is blue-ish
      name: nickname,
      isPlayer: true,
      boostX: 0,
      boostY: 0
    }];

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
      // Calculate mouse position relative to center of screen
      mouseRef.current = {
        x: e.clientX - rect.left - canvas.width / 2,
        y: e.clientY - rect.top - canvas.height / 2,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Spacebar Split Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        splitPlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const splitPlayer = () => {
    const currentBlobs = playerRef.current;
    if (currentBlobs.length >= 16) return; // Cap max cells

    const newBlobs: BlobEntity[] = [];
    const updatedBlobs: BlobEntity[] = [];

    currentBlobs.forEach(blob => {
      if (blob.radius >= MIN_SPLIT_RADIUS) {
         // Calculate new size
         const newArea = (Math.PI * blob.radius * blob.radius) / 2;
         const newRadius = Math.sqrt(newArea / Math.PI);
         
         // Direction for the split (towards mouse)
         const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
         
         // Update original blob (stays roughly where it is)
         updatedBlobs.push({
           ...blob,
           radius: newRadius
         });

         // Create projectile blob
         newBlobs.push({
           ...blob,
           id: `${blob.id}-${Date.now()}`,
           x: blob.x + Math.cos(angle) * (blob.radius), // Start slightly ahead to avoid instant overlap
           y: blob.y + Math.sin(angle) * (blob.radius),
           radius: newRadius,
           boostX: Math.cos(angle) * SPLIT_FORCE,
           boostY: Math.sin(angle) * SPLIT_FORCE
         });
      } else {
        updatedBlobs.push(blob);
      }
    });
    
    playerRef.current = [...updatedBlobs, ...newBlobs];
  };

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
      if (playerRef.current.length === 0) return;

      // --- 1. Update Player Blobs ---
      playerRef.current.forEach(player => {
        // Movement Logic
        // Heavier = Slower
        const speed = 200 / player.radius + 2; 
        const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
        
        // Move towards mouse
        const distMouse = Math.hypot(mouseRef.current.x, mouseRef.current.y);
        
        let moveX = 0;
        let moveY = 0;

        if (distMouse > 5) {
            moveX = Math.cos(angle) * speed;
            moveY = Math.sin(angle) * speed;
        }

        // Add boost (splitting impulse)
        if (player.boostX) {
          moveX += player.boostX;
          player.boostX *= 0.9; // Friction
          if (Math.abs(player.boostX) < 0.1) player.boostX = 0;
        }
        if (player.boostY) {
          moveY += player.boostY;
          player.boostY *= 0.9; // Friction
          if (Math.abs(player.boostY) < 0.1) player.boostY = 0;
        }

        player.x += moveX;
        player.y += moveY;

        // Boundaries
        player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));
      });

      // --- 2. Resolve Player-Player Collisions (Repulsion) ---
      // Prevent cells from stacking perfectly on top of each other
      for (let i = 0; i < playerRef.current.length; i++) {
        for (let j = i + 1; j < playerRef.current.length; j++) {
          const b1 = playerRef.current[i];
          const b2 = playerRef.current[j];
          const dx = b1.x - b2.x;
          const dy = b1.y - b2.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          // If overlapping (and not currently merging - merging logic omitted for simplicity of this step)
          if (dist < minDist && dist > 0) {
             const overlap = minDist - dist;
             const nx = dx / dist;
             const ny = dy / dist;
             
             // Push apart gently
             const force = overlap * 0.05; // Soft body physics
             
             b1.x += nx * force;
             b1.y += ny * force;
             b2.x -= nx * force;
             b2.y -= ny * force;
          }
        }
      }

      // --- 3. Update Bots ---
      botsRef.current.forEach(bot => {
        if (Math.random() < 0.02) {
          bot.dx = (Math.random() - 0.5) * 4;
          bot.dy = (Math.random() - 0.5) * 4;
        }

        if (bot.x - bot.radius < 0 || bot.x + bot.radius > WORLD_WIDTH) bot.dx = - (bot.dx || 1);
        if (bot.y - bot.radius < 0 || bot.y + bot.radius > WORLD_HEIGHT) bot.dy = - (bot.dy || 1);
        
        const botSpeed = (200 / bot.radius + 1.5) * 0.5; 
        const mag = Math.hypot(bot.dx || 0, bot.dy || 0);
        const vx = (bot.dx || 0) / (mag || 1) * botSpeed;
        const vy = (bot.dy || 0) / (mag || 1) * botSpeed;

        bot.x += vx;
        bot.y += vy;

        bot.x = Math.max(bot.radius, Math.min(WORLD_WIDTH - bot.radius, bot.x));
        bot.y = Math.max(bot.radius, Math.min(WORLD_HEIGHT - bot.radius, bot.y));
      });

      // --- 4. Collision Detection (Eating) ---
      
      const getArea = (r: number) => Math.PI * r * r;
      const getRadius = (area: number) => Math.sqrt(area / Math.PI);

      // Player(s) vs Food
      foodsRef.current = foodsRef.current.filter(food => {
        let eaten = false;
        // Check against all player blobs
        for (const playerBlob of playerRef.current) {
          const dist = Math.hypot(playerBlob.x - food.x, playerBlob.y - food.y);
          if (dist < playerBlob.radius) {
            const newArea = getArea(playerBlob.radius) + getArea(food.radius);
            playerBlob.radius = getRadius(newArea);
            eaten = true;
            break; 
          }
        }
        return !eaten;
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

      // Bots vs Player Blobs Interaction
      // We need to handle:
      // 1. Player eats Bot
      // 2. Bot eats Player
      
      const remainingBots: BlobEntity[] = [];
      let playerWasEaten = false;
      let killer = '';

      botsRef.current.forEach(bot => {
        let botEaten = false;
        
        // Check against all player blobs
        // Using a for loop to allow modification of playerRef inside if needed (though we filter later)
        // Actually safer to just mark things for deletion
        
        // Check if Bot eats any Player Blob
        for (const playerBlob of playerRef.current) {
            if (botEaten) break;

            const dist = Math.hypot(playerBlob.x - bot.x, playerBlob.y - bot.y);
            const overlap = dist < Math.max(playerBlob.radius, bot.radius);

            if (overlap) {
                if (playerBlob.radius > bot.radius * 1.1) {
                    // Player eats Bot
                    const newArea = getArea(playerBlob.radius) + getArea(bot.radius);
                    playerBlob.radius = getRadius(newArea);
                    botEaten = true;
                } else if (bot.radius > playerBlob.radius * 1.1) {
                    // Bot eats Player Blob
                    // Mark player blob as dead (set radius to 0 or filter out later)
                    const newArea = getArea(bot.radius) + getArea(playerBlob.radius);
                    bot.radius = getRadius(newArea);
                    playerBlob.radius = 0; // Mark for removal
                    playerWasEaten = true;
                    killer = bot.name || 'Unknown';
                }
            }
        }

        if (!botEaten) {
            remainingBots.push(bot);
        }
      });
      
      botsRef.current = remainingBots;
      
      // Remove dead player blobs
      if (playerWasEaten) {
          playerRef.current = playerRef.current.filter(p => p.radius > 0);
          if (playerRef.current.length === 0) {
              setKillerName(killer);
              setGameState(GameState.GAME_OVER);
          }
      }

      // Replenish Bots
       while (botsRef.current.length < MAX_BOTS) {
         // Base spawn size on average player size so it stays challenging/fair
         const avgPlayerRadius = playerRef.current.length > 0 
            ? playerRef.current.reduce((sum, p) => sum + p.radius, 0) / playerRef.current.length 
            : INITIAL_PLAYER_RADIUS;

         botsRef.current.push({
            id: `bot-new-${Date.now()}`,
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            radius: Math.max(10, Math.random() * (avgPlayerRadius * 1.5)), 
            color: getRandomColor(),
            name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
         });
       }

      // Update Score (Total Mass)
      const totalScore = playerRef.current.reduce((acc, p) => acc + Math.floor(p.radius), 0);
      setScore(totalScore);

      // Update Leaderboard
      if (Date.now() - lastLeaderboardUpdateRef.current > 1000) {
        // For leaderboard, if player has multiple cells, we can treat them as one aggregate score
        // or just show the largest cell. Usually games show the aggregate.
        const playerEntry = {
            id: 'player',
            name: nickname,
            score: totalScore
        };

        const botEntries = botsRef.current.map(b => ({
            id: b.id,
            name: b.name || 'Cell',
            score: Math.floor(b.radius)
        }));

        const allEntities = [...botEntries];
        if (playerRef.current.length > 0) {
            allEntities.push(playerEntry);
        }

        allEntities.sort((a, b) => b.score - a.score);
        setLeaderboard(allEntities.slice(0, 5));
        lastLeaderboardUpdateRef.current = Date.now();
      }
    };

    const draw = () => {
      if (playerRef.current.length === 0) return;

      // Clear background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera Logic
      // Find centroid of all player blobs
      let centroidX = 0;
      let centroidY = 0;
      let totalMass = 0;

      playerRef.current.forEach(p => {
          centroidX += p.x * p.radius; // Weighted by size
          centroidY += p.y * p.radius;
          totalMass += p.radius;
      });

      if (totalMass > 0) {
          centroidX /= totalMass;
          centroidY /= totalMass;
      } else {
          // Fallback
          centroidX = playerRef.current[0].x;
          centroidY = playerRef.current[0].y;
      }

      // Calculate required zoom to fit all blobs
      // Find bounds relative to centroid
      let maxDistX = 0;
      let maxDistY = 0;
      
      playerRef.current.forEach(p => {
          const dx = Math.abs(p.x - centroidX) + p.radius * 2; // Add padding
          const dy = Math.abs(p.y - centroidY) + p.radius * 2;
          if (dx > maxDistX) maxDistX = dx;
          if (dy > maxDistY) maxDistY = dy;
      });

      // Base zoom on the spread of cells + total size
      // Ensure minimum zoom level based on total mass as well
      const spreadZoom = Math.min(
          canvas.width / (maxDistX * 2.5 || 1), 
          canvas.height / (maxDistY * 2.5 || 1)
      );
      
      const sizeZoom = 1 / (Math.pow(totalMass / playerRef.current.length, 0.4) / 3);
      
      // Use the smaller zoom (either to fit spread or based on size)
      let zoom = Math.min(spreadZoom, sizeZoom);
      zoom = Math.max(0.1, Math.min(2, zoom)); // Clamp zoom

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-centroidX, -centroidY);

      // Draw Grid
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

      // Draw All Blobs (Player + Bots) sorted by size
      const allBlobs = [...botsRef.current, ...playerRef.current].sort((a, b) => a.radius - b.radius);

      allBlobs.forEach(blob => {
        ctx.fillStyle = blob.color;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Stroke
        ctx.strokeStyle = blob.isPlayer ? '#fff' : 'rgba(0,0,0,0.2)';
        ctx.lineWidth = blob.isPlayer ? 4 : 3;
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