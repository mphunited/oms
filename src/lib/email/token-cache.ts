"use client";

class TokenCache {
  private cache: Map<string, { token: string; expiresAt: number }> = new Map();
  private acquiringPromise: Promise<string> | null = null;

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() + 30_000 > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.token;
  }

  set(key: string, token: string, expiresInMs: number): void {
    this.cache.set(key, { token, expiresAt: Date.now() + expiresInMs });
  }

  clear(key?: string): void {
    if (key !== undefined) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async acquire(
    key: string,
    fn: () => Promise<{ token: string; expiresInMs: number }>
  ): Promise<string> {
    if (this.acquiringPromise) return this.acquiringPromise;

    const cached = this.get(key);
    if (cached) return cached;

    this.acquiringPromise = (async () => {
      try {
        const result = await fn();
        this.set(key, result.token, result.expiresInMs);
        return result.token;
      } finally {
        this.acquiringPromise = null;
      }
    })();

    return this.acquiringPromise;
  }
}

export const tokenCache = new TokenCache();
