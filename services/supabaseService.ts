import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Use empty strings as fallback to prevent crashes if env vars are missing
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export interface GlobalScore {
  nickname: string;
  score: number;
  created_at: string;
}

export const saveScoreToDb = async (nickname: string, score: number) => {
  if (!supabase) {
    console.warn('Supabase not configured. Score not saved.');
    return;
  }

  try {
    const { error } = await supabase
      .from('scores')
      .insert([{ nickname, score }]);

    if (error) {
      console.error('Error saving score to DB:', error);
    }
  } catch (err) {
    console.error('Unexpected error saving score:', err);
  }
};

export const getGlobalLeaderboard = async (limit = 5): Promise<GlobalScore[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('scores')
      .select('nickname, score, created_at')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data as GlobalScore[];
  } catch (err) {
    console.error('Unexpected error fetching leaderboard:', err);
    return [];
  }
};