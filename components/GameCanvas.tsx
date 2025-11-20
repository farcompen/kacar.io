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
  MERGE_COOLDOWN,
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
  const lastMaxScoreRef = useRef<number>(INITIAL_PLAYER_RADIUS);
  const isGameOverRef = useRef<boolean>(false);

  // Helper Math functions
  const getArea = (r: number) => Math.PI * r * r;
  const getRadius = (area: number) => Math.sqrt(area / Math.PI);

  // Initialize game entities
  useEffect(() => {
    isGameOverRef.current = false;
    lastMaxScoreRef.current = INITIAL_PLAYER_RADIUS;

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
    if (isGameOverRef.current) return;

    const currentBlobs = playerRef.current;
    if (currentBlobs.length >= 16) return; // Cap max cells

    const newBlobs: BlobEntity[] = [];
    const updatedBlobs: BlobEntity[] = [];
    const now = Date.now();

    currentBlobs.forEach(blob => {
      if (blob.radius >= MIN_SPLIT_RADIUS) {
         // Calculate new size
         const newArea = (Math.PI * blob.radius * blob.radius) / 2;
         const newRadius = Math.sqrt(newArea / Math.PI);
         
         // Direction for the split (towards mouse)
         const angle = Math.atan2(mouseRef.current.y, mouseRef.current.x);
         
         // Update original blob (stays roughly where it is)
         // IMPORTANT: Reset createdAt so it waits another 10s to merge
         updatedBlobs.push({
           ...blob,
           radius: newRadius,
           createdAt: now
         });

         // Create projectile blob
         newBlobs.push({
           ...blob,
           id: `${blob.id}-${now}`,
           x: blob.x + Math.cos(angle) * (blob.radius), // Start slightly ahead to avoid instant overlap
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

      // --- 2. Resolve Player-Player Collisions (Repulsion OR Merge) ---
      const blobsToRemove = new Set<string>();
      const now = Date.now();

      for (let i = 0; i < playerRef.current.length; i++) {
        for (let j = i + 1; j < playerRef.current.length; j++) {
          const b1 = playerRef.current[i];
          const b2 = playerRef.current[j];

          if (blobsToRemove.has(b1.id) || blobsToRemove.has(b2.id)) continue;

          const dx = b1.x - b2.x;
          const dy = b1.y - b2.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          // Check if they can merge (both must be old enough)
          const age1 = now - (b1.createdAt || 0);
          const age2 = now - (b2.createdAt || 0);
          const canMerge = age1 > MERGE_COOLDOWN && age2 > MERGE_COOLDOWN;

          if (canMerge) {
            // ATTRACTION logic
            if (dist < minDist + 50) { 
                 const force = 0.02;
                 b1.x -= dx * force;
                 b1.y -= dy * force;
                 b2.x += dx * force;
                 b2.y += dy * force;
            }

            // MERGE logic (Overlap > 60%)
            if (dist < (b1.radius + b2.radius) * 0.6) {
                const newArea = getArea(b1.radius) + getArea(b2.radius);
                const newRadius = getRadius(newArea);
                
                b1.x = (b1.x * b1.radius + b2.x * b2.radius) / (b1.radius + b2.radius);
                b1.y = (b1.y * b1.radius + b2.y * b2.radius) / (b1.radius + b2.radius);
                b1.radius = newRadius;
                
                blobsToRemove.add(b2.id);
            }

          } else {
            // REPULSION logic
            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                const force = overlap * 0.05; 
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

      // --- 3. Update Bots (Improved Physics & Interaction) ---
      
      // 3.1 Bot Movement & Physics
      botsRef.current.forEach(bot => {
        // Bigger bots change direction less frequently (more inertia)
        const directionChangeChance = Math.max(0.005, 0.03 - (bot.radius / 5000)); 
        
        if (Math.random() < directionChangeChance) {
          bot.dx = (Math.random() - 0.5) * 4;
          bot.dy = (Math.random() - 0.5) * 4;
        }

        // Border bounce
        if (bot.x - bot.radius < 0 || bot.x + bot.radius > WORLD_WIDTH) bot.dx = - (bot.dx || 1);
        if (bot.y - bot.radius < 0 || bot.y + bot.radius > WORLD_HEIGHT) bot.dy = - (bot.dy || 1);
        
        // Speed Calculation: Ensure minimum speed so big bots don't stop
        // Formula: Starts high for small bots, decays but capped at 1.0 minimum
        const botSpeed = Math.max(1.0, (250 / bot.radius) + 0.5); 
        
        const mag = Math.hypot(bot.dx || 0, bot.dy || 0);
        const vx = (bot.dx || 0) / (mag || 1) * botSpeed;
        const vy = (bot.dy || 0) / (mag || 1) * botSpeed;

        bot.x += vx;
        bot.y += vy;

        bot.x = Math.max(bot.radius, Math.min(WORLD_WIDTH - bot.radius, bot.x));
        bot.y = Math.max(bot.radius, Math.min(WORLD_HEIGHT - bot.radius, bot.y));
      });

      // 3.2 Bot vs Bot Collision (Cannibalism)
      // We sort by radius desc to handle largest eating first in this frame
      botsRef.current.sort((a, b) => b.radius - a.radius);
      const eatenBotIds = new Set<string>();

      for (let i = 0; i < botsRef.current.length; i++) {
        const hunter = botsRef.current[i];
        if (eatenBotIds.has(hunter.id)) continue;

        for (let j = i + 1; j < botsRef.current.length; j++) {
          const prey = botsRef.current[j];
          if (eatenBotIds.has(prey.id)) continue;

          const dist = Math.hypot(hunter.x - prey.x, hunter.y - prey.y);
          
          // Collision Check
          if (dist < hunter.radius) {
             // Eating Rule: Hunter must be at least 10% larger
             if (hunter.radius > prey.radius * 1.1) {
                const newArea = getArea(hunter.radius) + getArea(prey.radius);
                hunter.radius = getRadius(newArea);
                eatenBotIds.add(prey.id);
             }
          }
        }
      }

      // Remove bots eaten by other bots
      if (eatenBotIds.size > 0) {
        botsRef.current = botsRef.current.filter(b => !eatenBotIds.has(b.id));
      }

      // --- 4. Collision Detection (Eating Food) ---
      
      // Player(s) vs Food
      foodsRef.current = foodsRef.current.filter(food => {
        let eaten = false;
        for (const playerBlob of playerRef.current) {
          const dist = Math.hypot(playerBlob.x - food.x, playerBlob.y - food.y);
          if (dist < playerBlob.radius) {
            const newArea = getArea(playerBlob.radius) + getArea(food.radius);
            playerBlob.radius = getRadius(newArea);
            eaten = true;
            break; 
          }
        }
        // Bots vs Food (Basic optimization: only check if near)
        if (!eaten) {
           for (const bot of botsRef.current) {
             const dist = Math.hypot(bot.x - food.x, bot.y - food.y);
             if (dist < bot.radius) {
                const newArea = getArea(bot.radius) + getArea(food.radius);
                bot.radius = getRadius(newArea);
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

      // --- CRITICAL: Score Calculation (Before Death Logic) ---
      const currentTotalScore = playerRef.current.reduce((acc, p) => acc + Math.floor(p.radius), 0);
      if (currentTotalScore > 0) {
          lastMaxScoreRef.current = currentTotalScore;
          setScore(currentTotalScore);
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
                    // Player eats Bot
                    const newArea = getArea(playerBlob.radius) + getArea(bot.radius);
                    playerBlob.radius = getRadius(newArea);
                    botEaten = true;
                } else if (bot.radius > playerBlob.radius * 1.1) {
                    // Bot eats Player Blob
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
          
          // If all player blobs are gone
          if (playerRef.current.length === 0) {
              isGameOverRef.current = true;
              setKillerName(killer);
              setScore(lastMaxScoreRef.current);
              setGameState(GameState.GAME_OVER);
              return; 
          }
      }

      // Replenish Bots
       while (botsRef.current.length < MAX_BOTS) {
         // Logic: Calculate avg player radius
         const avgPlayerRadius = playerRef.current.length > 0 
            ? playerRef.current.reduce((sum, p) => sum + p.radius, 0) / playerRef.current.length 
            : INITIAL_PLAYER_RADIUS;

         // 25% Chance to spawn a "Rival" bot (scales with player size)
         // 75% Chance to spawn a "Feeder" bot (small)
         const isRivalBot = Math.random() < 0.25;
         
         let spawnRadius = 15;
         if (isRivalBot) {
             // Scale with player, but keep it random (0.5x to 1.5x of player size)
             // Capped at 3x player size to prevent impossible spawns, min 20
             spawnRadius = Math.max(20, Math.random() * avgPlayerRadius * 1.5);
         } else {
             // Standard small bot (15-45 radius)
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
            score: currentTotalScore 
        };

        const botEntries = botsRef.current.map(b => ({
            id: b.id,
            name: b.name || 'Cell',
            score: Math.floor(b.radius)
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
      let totalMass = 0;

      if (playerRef.current.length > 0) {
          playerRef.current.forEach(p => {
              centroidX += p.x * p.radius; 
              centroidY += p.y * p.radius;
              totalMass += p.radius;
          });
          if (totalMass > 0) {
              centroidX /= totalMass;
              centroidY /= totalMass;
          }
      } else {
          centroidX = WORLD_WIDTH / 2;
          centroidY = WORLD_HEIGHT / 2;
      }

      // Calculate required zoom to fit all blobs
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
      
      const sizeZoom = 1 / (Math.pow(totalMass / (playerRef.current.length || 1), 0.4) / 3);
      
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