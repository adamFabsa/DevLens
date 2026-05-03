import { initCache, deleteCacheEntry } from './cache';

async function clearTestCache() {
  await initCache();
  await deleteCacheEntry('excalidraw:authmodule');
  console.log('✅ Cleared cache entry: excalidraw:authmodule');
}

clearTestCache().catch(console.error);

// Made with Bob
