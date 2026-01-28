/**
 * Enterprise Account Detection Utility
 * 
 * This utility determines if a user account has enterprise-level features enabled.
 * Currently, all accounts are treated as standard tier.
 * 
 * When subscription tiers are implemented, this function should be updated to:
 * 1. Check merchant_settings.account_type in Supabase
 * 2. Or check user metadata for subscription level
 * 3. Or connect to a subscription service API
 * 
 * For now, the function accepts a user and checks for explicit enterprise flags
 * that can be set during development/testing.
 */

import type { User } from '../types';

/**
 * Check if a user has enterprise-level access
 * @param user The user object to check
 * @returns true if user has enterprise features, false otherwise
 */
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
