# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Context

DevLens is a codebase intelligence tool built for the IBM Bob Dev Day Hackathon (May 1-3, 2026). It answers plain-English questions about unfamiliar codebases using IBM Watson services, with semantic caching and voice support.

## Architecture

- **Frontend**: [`/app`](app/) - Next.js 16.2.4 App Router (React 19.2.4)
- **Backend**: [`/backend`](backend/) - Node modules (not yet implemented, placeholder only)
- **Demo Repository**: [`/demo-repo`](demo-repo/) - Will contain public open-source codebase for demo analysis
- **Hackathon Artifacts**: [`/bob_sessions`](bob_sessions/) - Exported Bob IDE task reports for judging

## IBM Services Integration

All IBM service credentials are required in `.env` (see [`.env.example`](.env.example)):

- **Cloudant**: Q&A caching with `CLOUDANT_DB_NAME=devlens-cache` (non-standard DB name)
- **NLU**: Semantic intent matching for cache lookups
- **STT/TTS**: Voice input/output
- **watsonx Orchestrate**: Onboarding checklist generation (requires `ORCHESTRATE_INSTANCE_ID`)

## Non-Standard Configurations

### Next.js Version Warning
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

### Tailwind CSS v4
Uses Tailwind CSS v4 with PostCSS plugin `@tailwindcss/postcss` (not the standard v3 setup). CSS imports use `@import "tailwindcss"` syntax in [`app/globals.css`](app/globals.css).

### ESLint Flat Config
Uses ESLint v9 flat config format in [`eslint.config.mjs`](eslint.config.mjs) with `defineConfig()` and `globalIgnores()` - not the legacy `.eslintrc` format.

### Custom Font Variables
Geist Sans and Geist Mono fonts are loaded with CSS variables `--font-geist-sans` and `--font-geist-mono`, referenced in Tailwind theme as `--font-sans` and `--font-mono`.

## Cost-Aware Routing

See [`.bob/rules/cost-aware-answering.md`](.bob/rules/cost-aware-answering.md) for the full mode-routing rules and answer format.

## Bob Session Export Discipline

Every meaningful Bob task in this project must be exported to `/bob_sessions/` immediately after completion. Naming convention: `NN-short-description.png` for the consumption summary screenshot and `NN-short-description.md` for the exported task history. Sequence numbers (NN) are zero-padded and global across the team. This export is a hackathon judging deliverable.

## Demo Codebase

DevLens analyzes Excalidraw (the open-source whiteboard tool at https://github.com/excalidraw/excalidraw) during demos. Excalidraw is MIT-licensed, ~55MB, ~1300 files. Clone with:

```bash
cd demo-repo
rm .gitkeep 2>/dev/null
git clone --depth 1 https://github.com/excalidraw/excalidraw.git .
rm -rf .git
```

The clone is gitignored to avoid committing 55MB of unrelated source.

## Commands

```bash
npm run dev    # Start Next.js dev server
npm run build  # Production build
npm run lint   # Run ESLint (no test command yet)
