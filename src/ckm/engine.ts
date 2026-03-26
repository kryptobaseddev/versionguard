/**
 * CKM engine — auto-generates topic index from a ckm.json manifest.
 *
 * @remarks
 * This module is designed to be reusable across any CLI tool that
 * generates a `ckm.json` via forge-ts. It requires zero manual
 * topic mapping — topics are derived from the CKM structure itself.
 *
 * ## How topics are derived
 *
 * 1. Each `*Config` concept becomes a topic (e.g., `CalVerConfig` → `calver`)
 * 2. Config schema entries are grouped by their key prefix
 * 3. Operations are linked to topics by keyword matching on their description
 * 4. Constraints are linked by their `enforcedBy` field
 *
 * ## Integration pattern
 *
 * ```ts
 * import { createCkmEngine } from './ckm/engine';
 * import ckmRaw from '../docs/ckm.json?raw';
 *
 * const engine = createCkmEngine(JSON.parse(ckmRaw));
 * console.log(engine.getTopicIndex());
 * console.log(JSON.stringify(engine.getTopicJson('calver')));
 * ```
 *
 * @packageDocumentation
 */

import type { CkmConfigEntry, CkmManifest, CkmTopic } from './types';

/**
 * Topic derivation rules applied to CKM concept names.
 *
 * @remarks
 * Strips common suffixes and normalizes to lowercase slugs.
 */
function deriveTopicSlug(conceptName: string): string {
  return conceptName
    .replace(/Config$/, '')
    .replace(/Result$/, '')
    .replace(/Options$/, '')
    .toLowerCase();
}

/**
 * Checks if a concept name represents a config-like topic.
 *
 * @remarks
 * Only `*Config` interfaces become topics. Result types, internal
 * types, and options are excluded from the topic index.
 */
function isTopicConcept(name: string): boolean {
  return name.endsWith('Config') && name !== 'VersionGuardConfig';
}

/**
 * Matches an operation to a topic by keyword analysis.
 *
 * @remarks
 * Checks the operation name and description against the topic slug
 * and related concept names.
 */
function operationMatchesTopic(
  op: { name: string; what: string },
  topicSlug: string,
  conceptNames: string[],
): boolean {
  const haystack = `${op.name} ${op.what}`.toLowerCase();
  if (haystack.includes(topicSlug)) return true;
  // Match concept-derived keywords (e.g., 'calver' matches 'CalVer')
  return conceptNames.some((n) => haystack.includes(n.toLowerCase()));
}

/**
 * The CKM engine — provides topic derivation, filtering, and output formatting.
 *
 * @remarks
 * Instantiate via {@link createCkmEngine}. All topic data is derived
 * from the CKM manifest at construction time with zero configuration.
 *
 * @public
 * @since 0.4.0
 */
export interface CkmEngine {
  /** All auto-derived topics. */
  readonly topics: CkmTopic[];

  /**
   * Returns a formatted topic index for terminal display.
   *
   * @param toolName - CLI tool name for the usage line.
   * @returns Formatted string.
   */
  getTopicIndex(toolName?: string): string;

  /**
   * Returns human-readable content for a topic.
   *
   * @param topicName - Topic slug.
   * @returns Formatted content, or null if not found.
   */
  getTopicContent(topicName: string): string | null;

  /**
   * Returns CKM-filtered JSON for a topic (machine-readable).
   *
   * @param topicName - Topic slug, or undefined for full index.
   * @returns JSON-serializable object.
   */
  getTopicJson(topicName?: string): object;

  /**
   * Returns the raw CKM manifest.
   */
  getManifest(): CkmManifest;
}

/**
 * Creates a CKM engine from a parsed manifest.
 *
 * @remarks
 * This is the main entry point for the reusable CKM module.
 * Pass the parsed contents of `ckm.json` and get back an engine
 * that auto-derives topics and provides formatted output.
 *
 * @param manifest - Parsed CKM manifest (from forge-ts `ckm.json`).
 * @returns A configured CKM engine.
 *
 * @example
 * ```ts
 * import { createCkmEngine } from './ckm/engine';
 *
 * const engine = createCkmEngine(manifest);
 * console.log(engine.getTopicIndex('mytool'));
 * ```
 *
 * @public
 * @since 0.4.0
 */
export function createCkmEngine(manifest: CkmManifest): CkmEngine {
  const topics = deriveTopics(manifest);

  return {
    topics,
    getTopicIndex: (toolName = 'tool') => formatTopicIndex(topics, toolName),
    getTopicContent: (name) => formatTopicContent(topics, name),
    getTopicJson: (name) => buildTopicJson(topics, manifest, name),
    getManifest: () => manifest,
  };
}

/**
 * Derives topics from the CKM manifest automatically.
 */
function deriveTopics(manifest: CkmManifest): CkmTopic[] {
  const topics: CkmTopic[] = [];

  for (const concept of manifest.concepts) {
    if (!isTopicConcept(concept.name)) continue;

    const slug = deriveTopicSlug(concept.name);
    const conceptNames = [concept.name];

    // Find related concepts (e.g., GitHooksConfig relates to GitConfig)
    const relatedConcepts = manifest.concepts.filter(
      (c) =>
        c.name !== concept.name &&
        (c.name.toLowerCase().includes(slug) || slug.includes(deriveTopicSlug(c.name))),
    );
    conceptNames.push(...relatedConcepts.map((c) => c.name));

    // Find operations that reference this topic
    const operations = manifest.operations.filter((op) =>
      operationMatchesTopic(op, slug, conceptNames),
    );

    // Find config entries by prefix
    const configSchema = manifest.configSchema.filter((c) =>
      conceptNames.some((n) => c.key?.startsWith(n)),
    );

    // Find constraints
    const constraints = manifest.constraints.filter(
      (c) =>
        conceptNames.some((n) => c.enforcedBy?.includes(n)) ||
        operations.some((o) => c.enforcedBy?.includes(o.name)),
    );

    topics.push({
      name: slug,
      summary: concept.what,
      concepts: [concept, ...relatedConcepts],
      operations,
      configSchema,
      constraints,
    });
  }

  return topics;
}

/**
 * Formats the topic index for terminal display.
 */
function formatTopicIndex(topics: CkmTopic[], toolName: string): string {
  const lines = [
    `${toolName} CKM — Codebase Knowledge Manifest`,
    '',
    `Usage: ${toolName} ckm [topic] [--json] [--llm]`,
    '',
    'Topics:',
  ];

  const maxName = Math.max(...topics.map((t) => t.name.length));
  for (const topic of topics) {
    lines.push(`  ${topic.name.padEnd(maxName + 2)}${topic.summary}`);
  }

  lines.push('');
  lines.push('Flags:');
  lines.push('  --json    Machine-readable CKM output (concepts, operations, config schema)');
  lines.push('  --llm     Full API context for LLM agents (forge-ts llms.txt)');

  return lines.join('\n');
}

/**
 * Formats a topic's content for human-readable terminal display.
 */
function formatTopicContent(topics: CkmTopic[], topicName: string): string | null {
  const topic = topics.find((t) => t.name === topicName);
  if (!topic) return null;

  const lines: string[] = [`# ${topic.summary}`, ''];

  // Concepts
  if (topic.concepts.length > 0) {
    lines.push('## Concepts', '');
    for (const c of topic.concepts) {
      lines.push(`  ${c.name} — ${c.what}`);
      if (c.properties) {
        for (const p of c.properties) {
          const def = findDefault(topic.configSchema, c.name, p.name);
          lines.push(`    ${p.name}: ${p.type}${def ? ` = ${def}` : ''}`);
          if (p.description) {
            lines.push(`      ${p.description}`);
          }
        }
      }
      lines.push('');
    }
  }

  // Operations
  if (topic.operations.length > 0) {
    lines.push('## Operations', '');
    for (const o of topic.operations) {
      lines.push(`  ${o.name}() — ${o.what}`);
      if (o.inputs) {
        for (const i of o.inputs) {
          lines.push(`    @param ${i.name}: ${i.description}`);
        }
      }
      lines.push('');
    }
  }

  // Config schema
  if (topic.configSchema.length > 0) {
    lines.push('## Config Fields', '');
    for (const c of topic.configSchema) {
      lines.push(`  ${c.key}: ${c.type}${c.default ? ` = ${c.default}` : ''}`);
      if (c.description) {
        lines.push(`    ${c.description}`);
      }
    }
    lines.push('');
  }

  // Constraints
  if (topic.constraints.length > 0) {
    lines.push('## Constraints', '');
    for (const c of topic.constraints) {
      lines.push(`  [${c.id}] ${c.rule}`);
      lines.push(`    Enforced by: ${c.enforcedBy}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function findDefault(
  schema: CkmConfigEntry[],
  conceptName: string,
  propName: string,
): string | undefined {
  return schema.find((c) => c.key === `${conceptName}.${propName}`)?.default;
}

/**
 * Builds the JSON output for a topic or the full index.
 */
function buildTopicJson(topics: CkmTopic[], manifest: CkmManifest, topicName?: string): object {
  if (!topicName) {
    return {
      topics: topics.map((t) => ({
        name: t.name,
        summary: t.summary,
        concepts: t.concepts.length,
        operations: t.operations.length,
        configFields: t.configSchema.length,
        constraints: t.constraints.length,
      })),
      ckm: {
        concepts: manifest.concepts.length,
        operations: manifest.operations.length,
        constraints: manifest.constraints.length,
        workflows: manifest.workflows.length,
        configSchema: manifest.configSchema.length,
      },
    };
  }

  const topic = topics.find((t) => t.name === topicName);
  if (!topic) {
    return { error: `Unknown topic: ${topicName}`, topics: topics.map((t) => t.name) };
  }

  return {
    topic: topic.name,
    summary: topic.summary,
    concepts: topic.concepts,
    operations: topic.operations,
    configSchema: topic.configSchema,
    constraints: topic.constraints,
  };
}
