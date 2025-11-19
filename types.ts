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
  dx?: number; // Velocity X for bots
  dy?: number; // Velocity Y for bots
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
