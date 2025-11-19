import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Use empty strings as fallback to prevent crashes if env vars are missing
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials missing! Check Vercel Environment Variables.");
} else {
  console.log("✅ Supabase Client Initialized with URL:", supabaseUrl);
}

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
    console.log(`Attempting to save score: ${nickname} - ${score}`);
    const { error } = await supabase
      .from('scores')
      .insert([{ nickname, score }]);

    if (error) {
      console.error('❌ Error saving score to DB:', error.message, error.details);
    } else {
      console.log('✅ Score saved successfully!');
    }
  } catch (err) {
    console.error('❌ Unexpected error saving score:', err);
  }
};

export const getGlobalLeaderboard = async (limit = 5): Promise<GlobalScore[]> => {
  if (!supabase) {
    console.warn("Cannot fetch leaderboard: Supabase client not initialized.");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('scores')
      .select('nickname, score, created_at')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching leaderboard:', error.message);
      return [];
    }
    
    if (data.length === 0) {
      console.log("ℹ️ Leaderboard fetched successfully but returned 0 rows. (Check RLS policies if this is unexpected)");
    }

    return data as GlobalScore[];
  } catch (err) {
    console.error('❌ Unexpected error fetching leaderboard:', err);
    return [];
  }
};