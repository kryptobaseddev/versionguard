# CKM — Codebase Knowledge Manifest

**Machine-readable operational knowledge for CLI tools.**

CKM bridges the gap between API documentation and actionable help. While `llms.txt` tells you what functions exist, CKM tells you what the tool **does**, what **concepts** it has, what **config** controls what **behavior**, and what **constraints** are enforced.

## What CKM Provides

| Section | What it answers | Source |
|---------|----------------|--------|
| **concepts** | "What domain objects does this tool have?" | Exported interfaces with TSDoc |
| **operations** | "What can I do with this tool?" | Exported functions with `@param`/`@returns` |
| **constraints** | "What rules are enforced?" | `@throws` analysis in validation functions |
| **workflows** | "How do I accomplish X?" | `@workflow` tags (manual annotation) |
| **configSchema** | "What config controls what behavior?" | Interface properties with `@defaultValue` |

## How It Works

### 1. Generate `ckm.json`

```bash
npx forge-ts build
# → docs/ckm.json (auto-generated from TSDoc)
```

### 2. Embed in CLI binary

```typescript
// Vite ?raw import compiles the JSON into the JS bundle
import ckmRaw from '../docs/ckm.json?raw';
import { createCkmEngine } from './ckm';

const engine = createCkmEngine(JSON.parse(ckmRaw));
```

### 3. Wire into Commander (or any CLI framework)

```typescript
program
  .command('ckm [topic]')
  .option('--json', 'Machine-readable output')
  .option('--llm', 'Full API context')
  .action((topic, options) => {
    if (options.json) {
      console.log(JSON.stringify(engine.getTopicJson(topic), null, 2));
    } else if (topic) {
      console.log(engine.getTopicContent(topic));
    } else {
      console.log(engine.getTopicIndex('mytool'));
    }
  });
```

### 4. Use from CLI

```bash
# Human: browse topics
mytool ckm

# Human: read a topic
mytool ckm calver

# LLM agent: get structured data
mytool ckm calver --json

# LLM agent: get full API context
mytool ckm --llm
```

## Auto-Derived Topics

Topics are **not manually maintained**. They're derived from the CKM structure:

1. Each `*Config` interface becomes a topic
2. The slug is the name without the `Config` suffix, lowercased
3. Operations are linked by keyword matching on their TSDoc description
4. Config entries are grouped by their key prefix
5. Constraints are linked by their `enforcedBy` field

**Example**: `CalVerConfig` → topic slug `calver` → matches operations containing "calver" in their description → includes config fields prefixed with `CalVerConfig.`

## Module Structure

```
src/ckm/
├── index.ts      # Barrel export
├── engine.ts     # Core logic: createCkmEngine(), topic derivation, formatting
└── types.ts      # CkmManifest, CkmTopic, CkmConcept, CkmOperation, etc.
```

### API

```typescript
import { createCkmEngine } from './ckm';

const engine = createCkmEngine(manifest);

// All auto-derived topics
engine.topics;                          // CkmTopic[]

// Terminal output
engine.getTopicIndex('mytool');         // string (formatted index)
engine.getTopicContent('calver');       // string | null (formatted topic)

// Machine-readable JSON
engine.getTopicJson();                  // Full index with counts
engine.getTopicJson('calver');          // Filtered: concepts + ops + config + constraints

// Raw manifest access
engine.getManifest();                   // CkmManifest
```

## MVI Progressive Disclosure

| Level | Command | Audience | Token cost |
|-------|---------|----------|------------|
| 0 | `ckm` | Human | ~200 |
| 1 | `ckm calver` | Human | ~500 |
| 1 | `ckm calver --json` | LLM agent | ~800 |
| 2 | `ckm --json` | LLM agent | ~2000 |
| 3 | `ckm --llm` | LLM agent | ~5000 |

Agents should start at level 0 and drill down only as needed.

## Reuse in Other Projects

The CKM module (`src/ckm/`) is self-contained with zero dependencies on VersionGuard internals. To use it in another project:

1. Copy `src/ckm/` into your project
2. Run `forge-ts build` to generate `docs/ckm.json`
3. Import and embed as shown above

Future: This will be extracted into `@codluv/ckm-cli` as a standalone drop-in package.

## Requirements

- [forge-ts](https://github.com/kryptobaseddev/forge-ts) >= 0.21.0 (generates `ckm.json`)
- Vite (for `?raw` imports at build time) or any bundler that supports raw file imports
- TSDoc annotations on exported interfaces and functions
