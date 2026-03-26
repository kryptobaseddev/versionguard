import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MANIFEST_TO_ECOSYSTEM,
  dependabotConfigExists,
  generateDependabotConfig,
  writeDependabotConfig,
} from '../github';
import { createTempProject } from './test-utils';

describe('MANIFEST_TO_ECOSYSTEM', () => {
  it('maps manifest sources to Dependabot ecosystems', () => {
    expect(MANIFEST_TO_ECOSYSTEM['package.json']).toBe('npm');
    expect(MANIFEST_TO_ECOSYSTEM['Cargo.toml']).toBe('cargo');
    expect(MANIFEST_TO_ECOSYSTEM['pyproject.toml']).toBe('pip');
    expect(MANIFEST_TO_ECOSYSTEM['pubspec.yaml']).toBe('pub');
    expect(MANIFEST_TO_ECOSYSTEM['composer.json']).toBe('composer');
    expect(MANIFEST_TO_ECOSYSTEM['pom.xml']).toBe('maven');
  });

  it('returns null for sources with no Dependabot equivalent', () => {
    expect(MANIFEST_TO_ECOSYSTEM.VERSION).toBeNull();
    expect(MANIFEST_TO_ECOSYSTEM['git-tag']).toBeNull();
    expect(MANIFEST_TO_ECOSYSTEM.auto).toBeNull();
    expect(MANIFEST_TO_ECOSYSTEM.custom).toBeNull();
  });
});

describe('generateDependabotConfig', () => {
  it('generates config with npm and github-actions for a Node.js project', () => {
    const config = generateDependabotConfig(['package.json']);
    expect(config).toContain('version: 2');
    expect(config).toContain('package-ecosystem: npm');
    expect(config).toContain('package-ecosystem: github-actions');
    expect(config).toContain('interval: weekly');
  });

  it('generates config for multiple ecosystems', () => {
    const config = generateDependabotConfig(['package.json', 'Cargo.toml']);
    expect(config).toContain('package-ecosystem: npm');
    expect(config).toContain('package-ecosystem: cargo');
    expect(config).toContain('package-ecosystem: github-actions');
  });

  it('deduplicates ecosystems', () => {
    const config = generateDependabotConfig(['package.json', 'package.json']);
    const npmCount = (config.match(/package-ecosystem: npm/g) || []).length;
    expect(npmCount).toBe(1);
  });

  it('skips manifests with no ecosystem mapping', () => {
    const config = generateDependabotConfig(['VERSION', 'git-tag']);
    expect(config).not.toContain('package-ecosystem: null');
    // Should only have github-actions
    const ecosystems = (config.match(/package-ecosystem:/g) || []).length;
    expect(ecosystems).toBe(1);
    expect(config).toContain('package-ecosystem: github-actions');
  });

  it('always includes github-actions even with no manifests', () => {
    const config = generateDependabotConfig([]);
    expect(config).toContain('package-ecosystem: github-actions');
  });

  it('includes minor-and-patch grouping for package ecosystems', () => {
    const config = generateDependabotConfig(['package.json']);
    expect(config).toContain('minor-and-patch');
    expect(config).toContain('minor');
    expect(config).toContain('patch');
  });
});

describe('writeDependabotConfig', () => {
  it('creates .github/ directory and writes dependabot.yml', () => {
    const cwd = createTempProject();
    const content = generateDependabotConfig(['package.json']);
    const filePath = writeDependabotConfig(cwd, content);

    expect(filePath).toBe(path.join(cwd, '.github', 'dependabot.yml'));
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('version: 2');
  });
});

describe('dependabotConfigExists', () => {
  it('returns false when file is missing', () => {
    const cwd = createTempProject();
    expect(dependabotConfigExists(cwd)).toBe(false);
  });

  it('returns true when file exists', () => {
    const cwd = createTempProject();
    writeDependabotConfig(cwd, generateDependabotConfig(['package.json']));
    expect(dependabotConfigExists(cwd)).toBe(true);
  });
});
