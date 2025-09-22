// Simple in-memory cache for development
// In production, use Redis or similar
const cache = new Map<string, { data: unknown; expires: number }>();

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  
  return item.data as T;
}

export function setCache<T>(key: string, data: T, ttlSeconds: number = 300): void {
  cache.set(key, {
    data,
    expires: Date.now() + (ttlSeconds * 1000),
  });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
}

// Cache keys
export const CACHE_KEYS = {
  USER_ORGS: (userId: string) => `user:${userId}:orgs`,
  PROPERTY_STATS: (propertyId: string) => `property:${propertyId}:stats`,
  PORTFOLIO_STATS: (orgId: string) => `portfolio:${orgId}:stats`,
} as const;
