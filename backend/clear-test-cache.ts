import { initCache, deleteCacheEntry } from './cache';

async function clearTestCache() {
  await initCache();
  
  const keys = [
    'conduit:authmodule',
    'conduit:auth',
    'conduit:articleservice',
    'conduit:article',
    'conduit:routes',
    'conduit:main',
    'conduit:codemain',
    'conduit:maincode',
    'conduit:codeused',
    'conduit:articleworks',
    'conduit:howarticleworks',
  ];
  
  for (const key of keys) {
    try {
      await deleteCacheEntry(key);
      console.log(`✅ Cleared: ${key}`);
    } catch (err) {
      console.log(`⊘ Skipped (not in cache): ${key}`);
    }
  }
}

clearTestCache().catch(console.error);
// Made with Bob
