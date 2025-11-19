export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 3000;

export const INITIAL_PLAYER_RADIUS = 20;
export const FOOD_RADIUS = 5;
export const MAX_BOTS = 25;
export const MAX_FOOD = 300;

export const COLORS = [
  '#F87171', // Red
  '#60A5FA', // Blue
  '#34D399', // Green
  '#FBBF24', // Yellow
  '#A78BFA', // Purple
  '#F472B6', // Pink
  '#FB923C', // Orange
  '#2DD4BF', // Teal
];

export const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const BOT_NAMES = [
  "Orbiter", "Nebula", "Quasar", "Pulsar", "Comet", 
  "Asteroid", "Vortex", "Galaxy", "Cosmos", "Eclipse",
  "Nova", "Zenith", "Apex", "Vertex", "Matrix",
  "Glitch", "Byte", "Pixel", "Vector", "Scalar"
];
