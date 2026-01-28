// Generate a deterministic UUID v4-like ID from a Square access token
// This must match the backend's generateUUIDFromToken function to ensure data consistency
// Backend uses: crypto.createHash('sha256').update(token).digest('hex')
// Then formats as: `${hash.substring(0, 8)}-${hash.substring(8, 12)}-...`

export async function generateUUIDFromToken(token: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    
    // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
  } catch (e) {
    console.error('[TokenUUID] Failed to generate UUID:', e);
    throw new Error('Failed to generate user ID from token');
  }
}
