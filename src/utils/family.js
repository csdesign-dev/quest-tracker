import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Generate a random 6-character invite code
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== FAMILY CRUD ====================

/**
 * Create a new family. The current user becomes a 'parent'.
 */
export async function createFamily(name) {
  if (!isSupabaseConfigured()) return { error: 'Supabase не налаштований' };

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) return { error: 'Не авторизовано' };

  const userId = userData.user.id;
  const inviteCode = generateInviteCode();

  // Create family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ name, created_by: userId, invite_code: inviteCode })
    .select()
    .single();

  if (familyError) return { error: familyError.message };

  // Add creator as parent
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: userId,
      role: 'parent',
      nickname: userData.user.email?.split('@')[0] || 'Батько',
    });

  if (memberError) return { error: memberError.message };

  return { data: family };
}

/**
 * Join an existing family using an invite code.
 */
export async function joinFamily(inviteCode, role = 'child') {
  if (!isSupabaseConfigured()) return { error: 'Supabase не налаштований' };

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) return { error: 'Не авторизовано' };

  const userId = userData.user.id;

  // Find family by invite code
  const { data: family, error: findError } = await supabase
    .from('families')
    .select('id, name')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .single();

  if (findError || !family) return { error: 'Сім\'ю з таким кодом не знайдено' };

  // Check if already a member
  const { data: existing } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', family.id)
    .eq('user_id', userId)
    .single();

  if (existing) return { error: 'Ви вже є членом цієї сім\'ї' };

  // Add as member
  const { error: joinError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: userId,
      role,
      nickname: userData.user.email?.split('@')[0] || 'Член сім\'ї',
    });

  if (joinError) return { error: joinError.message };

  return { data: family };
}

/**
 * Get all families the current user belongs to (with members).
 */
export async function getMyFamilies() {
  if (!isSupabaseConfigured()) return { data: [] };

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) return { data: [] };

  const userId = userData.user.id;

  // Get family IDs where user is a member
  const { data: memberships, error: memberError } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', userId);

  if (memberError || !memberships || memberships.length === 0) return { data: [] };

  const familyIds = memberships.map(m => m.family_id);

  // Get families with all members
  const { data: families, error: familyError } = await supabase
    .from('families')
    .select('*')
    .in('id', familyIds);

  if (familyError) return { data: [] };

  // Get all members for these families
  const { data: allMembers, error: allMembersError } = await supabase
    .from('family_members')
    .select('*')
    .in('family_id', familyIds);

  if (allMembersError) return { data: [] };

  // Get profiles for all members
  const memberUserIds = [...new Set(allMembers.map(m => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, color')
    .in('id', memberUserIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  // Combine
  const result = families.map(f => {
    const myRole = memberships.find(m => m.family_id === f.id)?.role || 'member';
    const members = allMembers
      .filter(m => m.family_id === f.id)
      .map(m => ({
        ...m,
        profile: profileMap[m.user_id] || { name: m.nickname || 'Користувач', color: '#7c3aed' },
      }));

    return { ...f, myRole, members };
  });

  return { data: result };
}

/**
 * Get a family member's tasks (from cloud_sync).
 */
export async function getMemberTasks(memberUserId) {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('cloud_sync')
    .select('tasks_data, updated_at')
    .eq('user_id', memberUserId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return data.tasks_data;
}

/**
 * Update a member's role (only parents can do this).
 */
export async function updateMemberRole(memberId, newRole) {
  if (!isSupabaseConfigured()) return { error: 'Supabase не налаштований' };

  const { error } = await supabase
    .from('family_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) return { error: error.message };
  return { data: true };
}

/**
 * Remove a member from a family.
 */
export async function removeMember(memberId) {
  if (!isSupabaseConfigured()) return { error: 'Supabase не налаштований' };

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', memberId);

  if (error) return { error: error.message };
  return { data: true };
}

/**
 * Leave a family.
 */
export async function leaveFamily(familyId) {
  if (!isSupabaseConfigured()) return { error: 'Supabase не налаштований' };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Не авторизовано' };

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', userData.user.id);

  if (error) return { error: error.message };
  return { data: true };
}

/**
 * Delete a family (only creator).
 */
export async function deleteFamily(familyId) {
  if (!isSupabaseConfigured()) return { error: 'Supabase не налаштований' };

  // Members will cascade delete
  const { error } = await supabase
    .from('families')
    .delete()
    .eq('id', familyId);

  if (error) return { error: error.message };
  return { data: true };
}
