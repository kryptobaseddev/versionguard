/**
 * CKM (Codebase Knowledge Manifest) module.
 *
 * @remarks
 * Reusable module for any CLI tool that generates `ckm.json` via forge-ts.
 * Provides auto-derived topics, machine-readable JSON output, and
 * human-readable terminal formatting — all with zero manual configuration.
 *
 * ## Quick start
 *
 * ```ts
 * import { createCkmEngine } from './ckm';
 * import ckmRaw from '../docs/ckm.json?raw';
 *
 * const engine = createCkmEngine(JSON.parse(ckmRaw));
 *
 * // Terminal: topic index
 * console.log(engine.getTopicIndex('mytool'));
 *
 * // Terminal: specific topic
 * console.log(engine.getTopicContent('calver'));
 *
 * // JSON: for LLM agents
 * console.log(JSON.stringify(engine.getTopicJson('calver'), null, 2));
 * ```
 *
 * @packageDocumentation
 * @public
 */

export { type CkmEngine, createCkmEngine } from './engine';
export type {
  CkmConcept,
  CkmConfigEntry,
  CkmConstraint,
  CkmInput,
  CkmManifest,
  CkmOperation,
  CkmProperty,
  CkmTopic,
  CkmWorkflow,
} from './types';
