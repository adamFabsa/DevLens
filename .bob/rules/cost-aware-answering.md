# Cost-Aware Answering for DevLens

DevLens is a hackathon demo where every Bob interaction's cost is visible to judges. This rule ensures answers are focused, efficient, and appropriately routed to minimize token usage while maintaining quality. Every extra token has a cost—choose the right mode and keep answers concise.

## Mode Routing Rules

### Simple Lookups → Ask Mode

Use Ask mode for straightforward questions that require reading and explaining existing code without structural analysis.

**Trigger patterns:**
- "What does X do?"
- "Where is Y defined?"
- "Explain function Z"
- "What's the purpose of file/class/variable X?"

**Examples:**
- ✅ "What does `useCache()` do?" → Ask mode
- ✅ "Where is the Cloudant client initialized?" → Ask mode

### Structural Analysis → Code Mode

Use Code mode when the question requires understanding relationships, dependencies, or data flow between multiple components.

**Trigger patterns:**
- "How do X and Y connect?"
- "What calls function X?"
- "Trace the data flow from A to B"
- "Show me the dependency chain for X"
- "What components use service Y?"

**Examples:**
- ✅ "How do NLU and Cloudant work together?" → Code mode
- ✅ "What files import the Watson client?" → Code mode

### Complex Generation → Code Mode

Use Code mode for any task that involves writing new code, tests, documentation, or refactoring.

**Trigger patterns:**
- "Write tests for X"
- "Generate documentation for Y"
- "Refactor function Z"
- "Debug why X fails"
- "Add error handling to Y"

**Examples:**
- ✅ "Write unit tests for the cache lookup" → Code mode
- ✅ "Add TypeScript types to the API client" → Code mode

### Architectural Planning → Plan Mode

Use Plan mode for high-level design questions, feature planning, or approach discussions that don't require immediate code changes.

**Trigger patterns:**
- "How should I structure feature X?"
- "What's the right approach for Y?"
- "Should I use pattern A or B?"
- "Plan the implementation of Z"

**Examples:**
- ✅ "How should I structure the voice input feature?" → Plan mode
- ✅ "What's the best way to handle rate limiting?" → Plan mode

## Required Answer Format

### Mode Declaration Prefix

Every answer must begin with exactly one line in this format:

```
[Mode: Ask|Code|Plan] [Reason: one short sentence]
```

**Requirements:**
- Mode must be one of: `Ask`, `Code`, or `Plan`
- Reason must be one sentence, under 15 words
- This line must be the first line of your answer
- This makes mode usage visible in exports and cost attribution

**Examples:**
- `[Mode: Ask] [Reason: Simple lookup of function definition]`
- `[Mode: Code] [Reason: Requires tracing dependencies across multiple files]`
- `[Mode: Plan] [Reason: Architectural decision needs design discussion]`

### Conciseness Standard

**Default answer length: under 150 words.**

Longer answers are allowed only when the question genuinely requires it. Every token has a cost. If you need more than 150 words, the complexity likely justifies it—but always ask yourself if you can be more concise.

## Cache-Awareness Protocol

Before answering any question, consider whether it's been answered before in this project.

**Check for prior answers:**
1. Look at `/bob_sessions/*.md` file names for similar topics
2. If a question feels familiar, note it at the top of your answer:
   ```
   ⚠️ This question may already be cached—check /bob_sessions for prior answers.
   ```

**When to reference vs. re-answer:**
- If the exact question was asked in the same session → reference it (see Repeat Question Handling)
- If a similar question was asked in a different session → note the cache hint, then answer
- If context has changed significantly → answer fresh

## Scope Discipline

When asked to generate code, documentation, tests, or boilerplate:

**Generate only what was requested. No extras.**

- ❌ Don't add "helpful" improvements the user didn't ask for
- ❌ Don't refactor adjacent code unless explicitly requested
- ❌ Don't create additional files beyond the scope
- ✅ Do exactly what was asked, nothing more

If you think something extra would be valuable, ask first—don't assume.

## Repeat Question Handling

If the same question appears twice in a session:

**Second answer should be one line referencing the first:**

```
[Mode: Ask] [Reason: Duplicate question]
See answer in [task/message reference from earlier in this session].
```

**Exception:** If context has changed significantly (new files added, code modified, etc.), provide a fresh answer and note what changed.