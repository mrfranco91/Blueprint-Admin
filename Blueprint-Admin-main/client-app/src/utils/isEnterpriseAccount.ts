import type { User } from '../types';

export function isEnterpriseAccount(user: User | null): boolean {
  if (!user) return false;
  
  // Check if user has explicit enterprise flag set
  // This can be set via Supabase user metadata or passed in User object
  if (user.isEnterprise === true) return true;
  
  // TODO: When subscription tiers are implemented, add checks here:
  // const accountType = await fetchAccountTypeFromSupabase(user.id);
  // return accountType === 'enterprise';
  
  // Default: all current accounts are standard tier
  return false;
}

/**
 * Get the effective branding for a user based on their account tier
 * Enterprise accounts can customize branding, standard accounts use Blueprint default
 */
export function canCustomizeBranding(user: User | null): boolean {
  return isEnterpriseAccount(user);
}
