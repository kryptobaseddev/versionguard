/**
 * Version source providers for language-agnostic manifest support.
 *
 * @packageDocumentation
 * @public
 */

export { GitTagSource } from './git-tag';
export { JsonVersionSource } from './json';
export type { VersionSourceProvider } from './provider';
export { RegexVersionSource } from './regex';
export { detectManifests, resolveVersionSource } from './resolve';
export { TomlVersionSource } from './toml';
export { VersionFileSource } from './version-file';
export { YamlVersionSource } from './yaml';
