export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface Point {
  x: number;
  y: number;
}

export interface BlobEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  name?: string;
  isPlayer?: boolean;
  dx?: number; // Velocity X
  dy?: number; // Velocity Y
  boostX?: number; // Impulse velocity X for splitting
  boostY?: number; // Impulse velocity Y for splitting
}

export interface FoodEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
}