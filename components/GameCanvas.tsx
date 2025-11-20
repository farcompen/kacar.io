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
  COLLISION_COOLDOWN,
  MERGE_COOLDOWN,
  MASS_SCALE,
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
  const playerRef = useRef<BlobEntity[]>([]);
  const botsRef = useRef<BlobEntity[]>([]);
  const foodsRef = useRef<FoodEntity[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameIdRef = useRef<number>(0);
  const lastLeaderboardUpdateRef = useRef<number>(0);

  // Fix: Keep track of the last valid score to prevent it from dropping to 0 on death frame
  const lastMaxScoreRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);

  // --- Math Helpers for Mass System ---
  // Mass = (Radius / Scale)^2
  // Radius = sqrt(Mass) * Scale
  // Food = 1 Mass
  const getMass = (r: number) => Math.pow(r / MASS_SCALE, 2);
  const getRadiusFromMass = (m: number) => Math.sqrt(m) * MASS_SCALE;

  // Initialize game entities
  useEffect(() => {
    isGameOverRef.current = false;
    
    // Initial score is based on initial radius
    const startMass = getMass(INITIAL_PLAYER_RADIUS);
    lastMaxScoreRef.current = startMass;

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
      boostY: 0,
      createdAt: Date.now() // Track creation time for merge logic
    }];

    // Generate bots
    // Initial bots are mostly small to start fair
    botsRef.current = Array.from({ length: MAX_BOTS }).map((_, i) => ({
      id: `bot-${i}`,
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: Math.max(10, Math.random() * 40 + 10), // Random starting sizes (10-50)
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

    setScore(startMass);
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
    if (isGameOverRef.current) return;

    const currentBlobs = playerRef.current;
    if (currentBlobs.length >= 16) return; // Cap max cells

    const newBlobs: BlobEntity[] = [];
    const updatedBlobs: BlobEntity[] = [];
    const now = Date.now();

    currentBlobs.forEach(blob => {
      const currentMass = getMass(blob.radius);
      
      // Only split if mass is sufficient (check radius proxy)
      if (blob.radius >= MIN_SPLIT_RADIUS) {
         // Mass Conservation: Split mass exactly in half
         const halfMass = currentMass / 2;
         const newRadius = getRadiusFromMass(halfMass);
         
         // Direction for the split (towards mouse)
         const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
         
         // Update original blob (stays roughly where it is, but smaller)
         updatedBlobs.push({
           ...blob,
           radius: newRadius,
           createdAt: now // Reset merge timer on split
         });

         // Create projectile blob
         newBlobs.push({
           ...blob,
           id: `${blob.id}-${now}`,
           x: blob.x + Math.cos(angle) * (blob.radius), // Start slightly ahead to avoid immediate collision issues
           y: blob.y + Math.sin(angle) * (blob.radius),
           radius: newRadius,
           boostX: Math.cos(angle) * SPLIT_FORCE,
           boostY: Math.sin(angle) * SPLIT_FORCE,
           createdAt: now
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
      if (isGameOverRef.current) return;
      if (playerRef.current.length === 0 && !isGameOverRef.current) {
        return;
      }

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

      // --- 2. Resolve Player-Player Collisions (Repulsion, Grouping, or Merge) ---
      const blobsToRemove = new Set<string>();
      const now = Date.now();

      for (let i = 0; i < playerRef.current.length; i++) {
        for (let j = i + 1; j < playerRef.current.length; j++) {
          const b1 = playerRef.current[i];
          const b2 = playerRef.current[j];

          if (blobsToRemove.has(b1.id) || blobsToRemove.has(b2.id)) continue;

          const dx = b1.x - b2.x;
          const dy = b1.y - b2.y;
          let dist = Math.hypot(dx, dy);
          if (dist === 0) dist = 0.01; // Prevent divide by zero

          const minDist = b1.radius + b2.radius;

          const age1 = now - (b1.createdAt || 0);
          const age2 = now - (b2.createdAt || 0);
          
          // PHASE 3: Merge (> 10 seconds)
          const canMerge = age1 > MERGE_COOLDOWN && age2 > MERGE_COOLDOWN;
          
          // PHASE 2: Grouping/Touching (> 5 seconds)
          const canGroup = age1 > COLLISION_COOLDOWN && age2 > COLLISION_COOLDOWN;

          if (canMerge) {
            // ATTRACTION logic
            const pullFactor = 0.03; 
            b1.x -= dx * pullFactor;
            b1.y -= dy * pullFactor;
            b2.x += dx * pullFactor;
            b2.y += dy * pullFactor;

            // MERGE logic
            if (dist < (b1.radius + b2.radius) * 0.6) {
                // Add Mass (Conservation of Mass)
                const m1 = getMass(b1.radius);
                const m2 = getMass(b2.radius);
                b1.radius = getRadiusFromMass(m1 + m2);
                
                // New position weighted by mass
                b1.x = (b1.x * m1 + b2.x * m2) / (m1 + m2);
                b1.y = (b1.y * m1 + b2.y * m2) / (m1 + m2);
                
                blobsToRemove.add(b2.id);
            }
          } else if (canGroup) {
            // PHASE 2: Grouping (5s - 10s)
            if (dist < minDist) {
                // TOUCHING: Act solid (prevent overlap)
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                const force = overlap * 0.2;
                b1.x += nx * force;
                b1.y += ny * force;
                b2.x -= nx * force;
                b2.y -= ny * force;
            } else {
                // APART: Strong Magnetic Pull to bring them together
                const pullFactor = 0.1; // Stronger pull to group them quickly
                b1.x -= dx * pullFactor;
                b1.y -= dy * pullFactor;
                b2.x += dx * pullFactor;
                b2.y += dy * pullFactor;
            }
          } else {
            // PHASE 1: Repulsion (< 5 seconds)
            if (dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                const force = overlap * 0.15; 
                b1.x += nx * force;
                b1.y += ny * force;
                b2.x -= nx * force;
                b2.y -= ny * force;
            }
          }
        }
      }

      if (blobsToRemove.size > 0) {
        playerRef.current = playerRef.current.filter(b => !blobsToRemove.has(b.id));
      }

      // --- 3. Update Bots ---
      botsRef.current.forEach(bot => {
        const directionChangeChance = Math.max(0.005, 0.03 - (bot.radius / 5000)); 
        if (Math.random() < directionChangeChance) {
          bot.dx = (Math.random() - 0.5) * 4;
          bot.dy = (Math.random() - 0.5) * 4;
        }

        if (bot.x - bot.radius < 0 || bot.x + bot.radius > WORLD_WIDTH) bot.dx = - (bot.dx || 1);
        if (bot.y - bot.radius < 0 || bot.y + bot.radius > WORLD_HEIGHT) bot.dy = - (bot.dy || 1);
        
        const botSpeed = Math.max(1.0, (250 / bot.radius) + 0.5); 
        const mag = Math.hypot(bot.dx || 0, bot.dy || 0);
        const vx = (bot.dx || 0) / (mag || 1) * botSpeed;
        const vy = (bot.dy || 0) / (mag || 1) * botSpeed;

        bot.x += vx;
        bot.y += vy;
        bot.x = Math.max(bot.radius, Math.min(WORLD_WIDTH - bot.radius, bot.x));
        bot.y = Math.max(bot.radius, Math.min(WORLD_HEIGHT - bot.radius, bot.y));
      });

      // Bot Cannibalism
      botsRef.current.sort((a, b) => b.radius - a.radius);
      const eatenBotIds = new Set<string>();

      for (let i = 0; i < botsRef.current.length; i++) {
        const hunter = botsRef.current[i];
        if (eatenBotIds.has(hunter.id)) continue;
        for (let j = i + 1; j < botsRef.current.length; j++) {
          const prey = botsRef.current[j];
          if (eatenBotIds.has(prey.id)) continue;
          const dist = Math.hypot(hunter.x - prey.x, hunter.y - prey.y);
          if (dist < hunter.radius && hunter.radius > prey.radius * 1.1) {
             // Hunter Eats Prey (Mass Logic)
             const hunterMass = getMass(hunter.radius);
             const preyMass = getMass(prey.radius);
             hunter.radius = getRadiusFromMass(hunterMass + preyMass);
             eatenBotIds.add(prey.id);
          }
        }
      }
      if (eatenBotIds.size > 0) {
        botsRef.current = botsRef.current.filter(b => !eatenBotIds.has(b.id));
      }

      // --- 4. Eating Food ---
      // Each Food = +1 Mass
      const FOOD_MASS_GAIN = 1;

      foodsRef.current = foodsRef.current.filter(food => {
        let eaten = false;
        for (const playerBlob of playerRef.current) {
          const dist = Math.hypot(playerBlob.x - food.x, playerBlob.y - food.y);
          if (dist < playerBlob.radius) {
            // Mass Addition
            const currentMass = getMass(playerBlob.radius);
            playerBlob.radius = getRadiusFromMass(currentMass + FOOD_MASS_GAIN);
            eaten = true;
            break; 
          }
        }
        if (!eaten) {
           for (const bot of botsRef.current) {
             const dist = Math.hypot(bot.x - food.x, bot.y - food.y);
             if (dist < bot.radius) {
                // Mass Addition
                const currentMass = getMass(bot.radius);
                bot.radius = getRadiusFromMass(currentMass + FOOD_MASS_GAIN);
                eaten = true;
                break;
             }
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

      // --- SCORE CALCULATION (Strict Mass Based) ---
      // Calculate total mass (which corresponds to score)
      const currentTotalMass = Math.floor(playerRef.current.reduce((acc, p) => acc + getMass(p.radius), 0));
      if (currentTotalMass > 0) {
          lastMaxScoreRef.current = currentTotalMass;
          setScore(currentTotalMass);
      }

      // --- 5. Player vs Bot Interaction ---
      const remainingBots: BlobEntity[] = [];
      let playerWasEaten = false;
      let killer = '';

      botsRef.current.forEach(bot => {
        let botEaten = false;
        for (const playerBlob of playerRef.current) {
            if (botEaten) break;
            const dist = Math.hypot(playerBlob.x - bot.x, playerBlob.y - bot.y);
            const overlap = dist < Math.max(playerBlob.radius, bot.radius);

            if (overlap) {
                if (playerBlob.radius > bot.radius * 1.1) {
                    // Player eats Bot (Gain Bot Mass)
                    const pMass = getMass(playerBlob.radius);
                    const bMass = getMass(bot.radius);
                    playerBlob.radius = getRadiusFromMass(pMass + bMass);
                    botEaten = true;
                } else if (bot.radius > playerBlob.radius * 1.1) {
                    // Bot eats Player Blob
                    const bMass = getMass(bot.radius);
                    const pMass = getMass(playerBlob.radius);
                    bot.radius = getRadiusFromMass(bMass + pMass);
                    playerBlob.radius = 0;
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
      
      if (playerWasEaten) {
          playerRef.current = playerRef.current.filter(p => p.radius > 0);
          if (playerRef.current.length === 0) {
              isGameOverRef.current = true;
              setKillerName(killer);
              setScore(lastMaxScoreRef.current);
              setGameState(GameState.GAME_OVER);
              return; 
          }
      }

      // Replenish Bots with Specific Percentages
       while (botsRef.current.length < MAX_BOTS) {
         // Calculate average player radius
         const avgPlayerRadius = playerRef.current.length > 0 
            ? playerRef.current.reduce((sum, p) => sum + p.radius, 0) / playerRef.current.length 
            : INITIAL_PLAYER_RADIUS;

         const rand = Math.random();
         let spawnRadius = 15;

         if (rand < 0.05) {
            // 10% - 1.5x Player Size (Big Threat)
            spawnRadius = Math.max(20, avgPlayerRadius*0.6);
         } else if (rand < 0.20) {
            // 25% - 1.0x Player Size (Direct Rival) (0.10 + 0.25 = 0.35)
            spawnRadius = Math.max(20, avgPlayerRadius*0.5);
         } else if (rand < 0.50) {
            // 30% - 0.8x Player Size (Prey) (0.35 + 0.30 = 0.65)
            spawnRadius = Math.max(20, avgPlayerRadius * 0.4);
         } 
         else if (rand < 0.60) {
            // 30% - 0.8x Player Size (Prey) (0.35 + 0.30 = 0.65)
            spawnRadius = Math.max(20, avgPlayerRadius * 0.3);
         }
         else if (rand < 0.70) {
            // 30% - 0.8x Player Size (Prey) (0.35 + 0.30 = 0.65)
            spawnRadius = Math.max(20, avgPlayerRadius * 0.2);
         }
         else {
            // 35% - Remainder: Small Random Size (Fodder)
            spawnRadius = Math.floor(Math.random() * 30) + 15;
         }

         botsRef.current.push({
            id: `bot-new-${Date.now()}-${Math.random()}`,
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            radius: spawnRadius,
            color: getRandomColor(),
            name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
         });
       }

      // Update Leaderboard
      if (Date.now() - lastLeaderboardUpdateRef.current > 1000) {
        const playerEntry = {
            id: 'player',
            name: nickname,
            score: currentTotalMass 
        };

        const botEntries = botsRef.current.map(b => ({
            id: b.id,
            name: b.name || 'Cell',
            score: Math.floor(getMass(b.radius))
        }));

        const allEntities = [...botEntries];
        if (!isGameOverRef.current && playerRef.current.length > 0) {
            allEntities.push(playerEntry);
        }

        allEntities.sort((a, b) => b.score - a.score);
        setLeaderboard(allEntities.slice(0, 5));
        lastLeaderboardUpdateRef.current = Date.now();
      }
    };

    const draw = () => {
      if (playerRef.current.length === 0 && !isGameOverRef.current) return;

      // Clear background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera Logic
      let centroidX = 0;
      let centroidY = 0;
      let totalRadius = 0; 

      if (playerRef.current.length > 0) {
          playerRef.current.forEach(p => {
              centroidX += p.x * p.radius; 
              centroidY += p.y * p.radius;
              totalRadius += p.radius;
          });
          if (totalRadius > 0) {
              centroidX /= totalRadius;
              centroidY /= totalRadius;
          }
      } else {
          centroidX = WORLD_WIDTH / 2;
          centroidY = WORLD_HEIGHT / 2;
      }

      // Calculate zoom
      let maxDistX = 0;
      let maxDistY = 0;
      playerRef.current.forEach(p => {
          const dx = Math.abs(p.x - centroidX) + p.radius * 2; 
          const dy = Math.abs(p.y - centroidY) + p.radius * 2;
          if (dx > maxDistX) maxDistX = dx;
          if (dy > maxDistY) maxDistY = dy;
      });

      const spreadZoom = Math.min(
          canvas.width / (maxDistX * 2.5 || 1), 
          canvas.height / (maxDistY * 2.5 || 1)
      );
      
      // Zoom based on radius logic for smoother scaling
      const totalArea = playerRef.current.reduce((acc, p) => acc + (p.radius * p.radius), 0);
      const effectiveRadius = Math.sqrt(totalArea);
      const sizeZoom = 1 / (Math.pow(effectiveRadius, 0.4) / 3);
      
      let zoom = Math.min(spreadZoom, sizeZoom);
      zoom = Math.max(0.1, Math.min(2, zoom));

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

      // Draw All Blobs
      const allBlobs = [...botsRef.current, ...playerRef.current].sort((a, b) => a.radius - b.radius);

      allBlobs.forEach(blob => {
        ctx.fillStyle = blob.color;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = blob.isPlayer ? '#fff' : 'rgba(0,0,0,0.2)';
        ctx.lineWidth = blob.isPlayer ? 4 : 3;
        ctx.stroke();

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
      if (!isGameOverRef.current) {
         frameIdRef.current = requestAnimationFrame(renderLoop);
      }
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