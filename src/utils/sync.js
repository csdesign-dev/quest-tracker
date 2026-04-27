import { supabase, isSupabaseConfigured } from './supabase';
import { loadTasks, saveTasks } from './storage';

/**
 * Push local tasks to Supabase for the active profile
 */
export async function pushData(profileId, tasks) {
  if (!isSupabaseConfigured() || !profileId || !tasks) return false;

  try {
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.user) return false;

    const { error } = await supabase
      .from('cloud_sync')
      .upsert({
        user_id: user.user.id,
        profile_id: profileId,
        tasks_data: tasks,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, profile_id'
      });

    if (error) {
      console.error('Error pushing data to Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception pushing data:', err);
    return false;
  }
}

/**
 * Pull tasks from Supabase and merge/overwrite local storage
 * Returns the tasks if successful, or null if failed/not found.
 */
export async function pullData(profileId) {
  if (!isSupabaseConfigured() || !profileId) return null;

  try {
    const { data: user, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.user) return null;

    const { data, error } = await supabase
      .from('cloud_sync')
      .select('tasks_data, updated_at')
      .eq('user_id', user.user.id)
      .eq('profile_id', profileId)
      .single();

    if (error) {
      // PGRST116 means no rows found, which is fine for a new profile
      if (error.code !== 'PGRST116') {
        console.error('Error pulling data from Supabase:', error);
      }
      return null;
    }

    if (data && data.tasks_data) {
      // Save pulled data to localStorage to keep them in sync
      saveTasks(data.tasks_data, profileId);
      return data.tasks_data;
    }

    return null;
  } catch (err) {
    console.error('Exception pulling data:', err);
    return null;
  }
}
