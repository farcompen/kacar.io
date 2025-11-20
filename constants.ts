
export const WORLD_WIDTH = 9000;
export const WORLD_HEIGHT = 9000;

export const INITIAL_PLAYER_RADIUS = 20;
export const FOOD_RADIUS = 5;
export const MAX_BOTS = 70;
export const MAX_FOOD = 1200;

export const MIN_SPLIT_RADIUS = 40; // Minimum size required to split
export const SPLIT_FORCE = 25; // Velocity boost when splitting
export const MERGE_COOLDOWN = 10000; // 10 seconds before cells can re-merge

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
  "Glitch", "Byte", "Pixel", "Vector", "Scalar",
  "Titan", "Hyperion", "Chronos", "Helios", "Atlas",
  "Void", "Abyss", "Horizon", "Singularity", "Matter",
  "Proton", "Neutron", "Electron", "Quantum", "Nano",
  "Alpha", "Omega", "Delta", "Sigma", 
  "Zeta","John","Alex","ibrahim","Ahmet",
  "Sevil","Hülya","Kalender","Sinem","Filiz",
  "handsome","badboy","frankestein","hellboy",
  "arsenal","brazil","helga","julia"
];