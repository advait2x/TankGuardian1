import Constants from 'expo-constants';

let cachedDeviceId: string | null = null;

/**
 * Get a stable device identifier for local storage keys
 * Uses expo-constants to generate a consistent ID per device
 */
export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // Use installation ID if available (most stable)
  if (Constants.sessionId) {
    cachedDeviceId = `device_${Constants.sessionId}`;
    return cachedDeviceId;
  }

  // Fallback to a random ID stored in memory (persists for app session)
  const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  cachedDeviceId = `device_${randomId}`;
  return cachedDeviceId;
}

