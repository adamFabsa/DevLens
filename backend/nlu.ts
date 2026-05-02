/**
 * Natural Language Understanding wrapper for DevLens semantic intent extraction.
 *
 * This module extracts semantic intent from user questions using IBM Watson NLU.
 * The intent string becomes the cache key for Cloudant lookups, enabling
 * zero-cost cache hits when semantically similar questions are asked.
 */

import "dotenv/config";
import NaturalLanguageUnderstandingV1 from "ibm-watson/natural-language-understanding/v1";
import { IamAuthenticator } from "ibm-watson/auth";

// Module-level state
let nluClient: NaturalLanguageUnderstandingV1 | null = null;

/**
 * Ensures NLU client is initialized. Idempotent - safe to call multiple times.
 *
 * @throws {Error} If NLU_APIKEY or NLU_URL are missing from environment
 */
function ensureClient(): void {
  if (nluClient) return; // Already initialized

  const apikey = process.env.NLU_APIKEY;
  const url = process.env.NLU_URL;

  if (!apikey || !url) {
    throw new Error("Missing NLU_APIKEY or NLU_URL in environment");
  }

  const authenticator = new IamAuthenticator({ apikey });
  nluClient = new NaturalLanguageUnderstandingV1({
    version: "2022-04-07",
    authenticator,
    serviceUrl: url,
  });
}

/**
 * Normalizes keywords into a cache key format suitable for Cloudant document IDs.
 *
 * Rules:
 * - Lowercase all keywords
 * - Remove special characters (keep alphanumeric and hyphens)
 * - Sort alphabetically for determinism
 * - Join with colons
 *
 * @param keywords - Array of keyword strings from NLU
 * @returns Normalized cache key (e.g., "auth:explain:module")
 */
function normalizeKeywords(keywords: string[]): string {
  return keywords
    .map((kw) => kw.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((kw) => kw.length > 0)
    .sort()
    .join(":");
}

/**
 * Sanitizes raw text for use as a Cloudant document ID fallback.
 * Removes characters that are forbidden in Cloudant document IDs.
 *
 * @param text - Raw text to sanitize
 * @returns Sanitized text suitable for Cloudant document ID
 */
function sanitizeForCloudant(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extracts semantic intent from a user question for cache key generation.
 *
 * Uses IBM Watson NLU to extract the top 3 keywords, then normalizes them
 * into a deterministic cache key. The same question will always produce
 * the same intent string, enabling reliable cache hits.
 *
 * @param text - The user's question
 * @returns Normalized intent string suitable for use as Cloudant document ID
 * @throws {Error} If NLU credentials are missing
 * @throws {Error} If NLU API call fails (with context for 401/403 errors)
 */
export async function extractIntent(text: string): Promise<string> {
  ensureClient(); // Lazy initialization

  try {
    const response = await nluClient!.analyze({
      text,
      features: {
        keywords: {
          limit: 3,
        },
      },
    });

    const keywords = response.result.keywords;

    // If NLU returns keywords, normalize them
    if (keywords && keywords.length > 0) {
      const keywordTexts = keywords
        .map((kw) => kw.text || "")
        .filter((t) => t.length > 0);

      if (keywordTexts.length > 0) {
        return normalizeKeywords(keywordTexts);
      }
    }

    // Fallback: use sanitized input if no keywords extracted
    // (happens with very short input or non-semantic text)
    return sanitizeForCloudant(text);
  } catch (error: any) {
    // Provide helpful context for authentication errors
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `NLU authentication failed: Check NLU_APIKEY in .env (${error.message})`,
      );
    }

    throw new Error(`Failed to extract intent from NLU: ${error.message}`);
  }
}

// Made with Bob
