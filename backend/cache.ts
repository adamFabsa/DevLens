/**
 * Cloudant cache wrapper for DevLens Q&A caching.
 * 
 * This module provides a simple key-value cache interface backed by IBM Cloudant.
 * Every Q&A pair is stored with its semantic intent as the cache key, enabling
 * zero-cost cache hits when the same question is asked again (even by different users).
 */

import 'dotenv/config';
import { CloudantV1, IamAuthenticator } from '@ibm-cloud/cloudant';

/**
 * Cached answer structure stored in Cloudant.
 * Each document represents one Q&A pair with metadata.
 */
export interface CachedAnswer {
  question: string;        // Original question text
  intent: string;          // NLU-extracted semantic intent (cache key basis)
  answer: string;          // Bob's answer text  
  mode: 'Ask' | 'Code' | 'Plan';
  cost: number;            // Bobcoins cost when first answered
  repo: string;            // Demo repo name (e.g. "excalidraw")
  timestamp: number;       // ms epoch
  hitCount?: number;       // Optional: how many times this cache entry has been hit
}

// Module-level state
let client: CloudantV1;
let dbName: string;

/**
 * Initializes the Cloudant client and creates the cache database if it doesn't exist.
 * Safe to call multiple times (idempotent).
 * 
 * @throws {Error} If CLOUDANT_URL or CLOUDANT_APIKEY are missing
 * @throws {Error} If Cloudant connection fails
 */
export async function initCache(): Promise<void> {
  // Validate required environment variables
  const url = process.env.CLOUDANT_URL;
  const apikey = process.env.CLOUDANT_APIKEY;
  
  if (!url || !apikey) {
    throw new Error('Missing CLOUDANT_URL or CLOUDANT_APIKEY in environment');
  }
  
  // Set database name (with non-standard default)
  dbName = process.env.CLOUDANT_DB_NAME || 'devlens-cache';
  
  try {
    // Initialize authenticator and client
    const authenticator = new IamAuthenticator({ apikey });
    client = CloudantV1.newInstance({
      authenticator,
      serviceUrl: url,
    });
    
    // Check if database exists, create if not
    try {
      await client.getDatabaseInformation({ db: dbName });
      // Database exists, we're done
    } catch (error: any) {
      if (error.status === 404) {
        // Database doesn't exist, create it
        await client.putDatabase({ db: dbName });
        console.log(`✅ Created Cloudant database: ${dbName}`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to connect to Cloudant: ${error.message}`);
  }
}

/**
 * Retrieves a cached answer by cache key.
 * 
 * @param cacheKey - The cache key (typically NLU intent hash)
 * @returns The cached answer if found, null if not found
 * @throws {Error} If cache not initialized or Cloudant error (non-404)
 */
export async function checkCache(cacheKey: string): Promise<CachedAnswer | null> {
  if (!client) {
    throw new Error('Cache not initialized. Call initCache() first.');
  }
  
  try {
    const response = await client.getDocument({
      db: dbName,
      docId: cacheKey,
    });
    
    // Remove Cloudant metadata fields
    const { _id, _rev, ...cachedData } = response.result as any;
    
    return cachedData as CachedAnswer;
  } catch (error: any) {
    if (error.status === 404) {
      // Cache miss is normal, not an error
      return null;
    }
    throw new Error(`Failed to check cache for key ${cacheKey}: ${error.message}`);
  }
}

/**
 * Stores a Q&A entry in the cache. Overwrites existing entries with the same key.
 * 
 * @param cacheKey - The cache key (document ID)
 * @param data - The cached answer data
 * @throws {Error} If cache not initialized or Cloudant error
 */
export async function storeCache(cacheKey: string, data: CachedAnswer): Promise<void> {
  if (!client) {
    throw new Error('Cache not initialized. Call initCache() first.');
  }
  
  try {
    // Try to get existing document to obtain _rev for updates
    let existingRev: string | undefined;
    try {
      const existing = await client.getDocument({
        db: dbName,
        docId: cacheKey,
      });
      existingRev = (existing.result as any)._rev;
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
      // 404 means new document, proceed without _rev
    }
    
    // Prepare document with optional _rev for updates
    const document: any = {
      _id: cacheKey,
      ...data,
    };
    
    if (existingRev) {
      document._rev = existingRev;
    }
    
    await client.putDocument({
      db: dbName,
      docId: cacheKey,
      document,
    });
  } catch (error: any) {
    throw new Error(`Failed to store cache for key ${cacheKey}: ${error.message}`);
  }
}

/**
 * Deletes a single cache entry by key.
 * Used for cleanup in tests and to remove stale entries.
 * 
 * @param cacheKey - The cache key to delete
 * @throws {Error} If cache not initialized or Cloudant error (non-404)
 */
export async function deleteCacheEntry(cacheKey: string): Promise<void> {
  if (!client) {
    throw new Error('Cache not initialized. Call initCache() first.');
  }
  
  try {
    // Get document to obtain _rev (required for deletion)
    const response = await client.getDocument({
      db: dbName,
      docId: cacheKey,
    });
    
    const rev = (response.result as any)._rev;
    
    // Delete the document
    await client.deleteDocument({
      db: dbName,
      docId: cacheKey,
      rev,
    });
  } catch (error: any) {
    if (error.status === 404) {
      // Already deleted, silent success
      return;
    }
    throw new Error(`Failed to delete cache entry ${cacheKey}: ${error.message}`);
  }
}

/**
 * Deletes the entire cache database and recreates it empty.
 * ⚠️ WARNING: This destroys all cached data. Use only for demos and testing.
 * 
 * @throws {Error} If cache not initialized or Cloudant error
 */
export async function clearCache(): Promise<void> {
  if (!client) {
    throw new Error('Cache not initialized. Call initCache() first.');
  }
  
  console.warn(`⚠️  Clearing entire cache database: ${dbName}`);
  
  try {
    // Delete the database
    try {
      await client.deleteDatabase({ db: dbName });
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
      // 404 means already deleted, proceed
    }
    
    // Recreate empty database
    await client.putDatabase({ db: dbName });
    
    console.log('✅ Cache cleared and recreated');
  } catch (error: any) {
    throw new Error(`Failed to clear cache: ${error.message}`);
  }
}

// Made with Bob
