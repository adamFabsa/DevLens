# DevLens

**DevLens gets cheaper every time someone uses it.** First developer pays. Everyone after pays nothing. IBM Bob's own session data proves every number.

## Demo Video

TBD link

## The Problem

A new developer joins a team and faces an unfamiliar codebase. They burn hours asking colleagues "what does this module do," "how do these services connect," "where's the main logic." Every question costs the team time. Repeated questions across teammates compound the cost.

DevLens turns that into a one-time cost. Any developer asks plain-English questions about the codebase, by typing or by voice. IBM Bob reads the full repo and answers instantly. Every answer is cached in IBM Cloudant, indexed by IBM Natural Language Understanding for semantic matching. The next teammate to ask a similar question gets the cached answer at zero cost. At session end, watsonx Orchestrate generates a personalized onboarding checklist based on what the developer asked.

The cost panel shows it live. Per-question cost. Cumulative session cost. Cache hits highlighted. The mandatory `bob_sessions/` export becomes the proof: judges see the same numbers DevLens shows the user.

## How It Works

Architecture diagram: TBD

## IBM Services Used

- Bob IDE
- Cloudant
- NLU (Natural Language Understanding)
- STT (Speech-to-Text)
- TTS (Text-to-Speech)
- watsonx Orchestrate

## Bob Usage

See [/bob_sessions](./bob_sessions) for exported Bob IDE task session reports.

## Running Locally

```bash
npm install
cp .env.example .env
npm run dev
```

## Team

TBD

## License

MIT (placeholder)
