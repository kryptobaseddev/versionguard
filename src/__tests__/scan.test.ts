import { describe, expect, it } from 'vitest';

import { scanRepoForVersions } from '../sync';
import type { ScanConfig } from '../types';
import { createTempProject, writeTextFile } from './test-utils';

const defaultPatterns = [
  '(?:version\\s*[:=]\\s*["\'])([\\d]+\\.[\\d]+\\.[\\d]+(?:-[\\w.]+)?)["\']',
  '(?:FROM\\s+\\S+:)(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)',
  '(?:uses:\\s+\\S+@v?)(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)',
];

function makeScanConfig(overrides?: Partial<ScanConfig>): ScanConfig {
  return {
    enabled: true,
    patterns: defaultPatterns,
    allowlist: [],
    ...overrides,
  };
}

describe('scanRepoForVersions', () => {
  it('detects stale version literals in source files', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'src/config.ts', 'const version = "1.0.0";');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'src/config.ts', found: '1.0.0' });
  });

  it('ignores versions that match the expected version', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'src/config.ts', 'const version = "1.2.3";');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(0);
  });

  it('detects stale Docker image versions', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'Dockerfile', 'FROM node:18.0.0\nRUN echo hello');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'Dockerfile', found: '18.0.0' });
  });

  it('detects stale GitHub Actions versions', () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      '.github/workflows/ci.yml',
      'uses: actions/checkout@v3.5.0\nuses: actions/setup-node@v4.0.0',
    );

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.found).sort()).toEqual(['3.5.0', '4.0.0']);
  });

  it('respects ignore patterns', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'dist/bundle.js', 'const version = "0.9.0";');
    writeTextFile(cwd, 'src/index.ts', 'const version = "0.9.0";');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), ['dist/**'], cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('src/index.ts');
  });

  it('respects allowlist entries', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'Dockerfile', 'FROM node:18.0.0');
    writeTextFile(cwd, 'src/index.ts', 'const version = "0.9.0";');

    const config = makeScanConfig({
      allowlist: [{ file: 'Dockerfile', reason: 'Node.js base image is intentional' }],
    });

    const findings = scanRepoForVersions('1.2.3', config, [], cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('src/index.ts');
  });

  it('skips binary files by extension', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'image.png', 'version = "0.9.0"');
    writeTextFile(cwd, 'font.woff2', 'version = "0.9.0"');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(0);
  });

  it('returns line numbers for findings', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'config.yml', 'name: app\nversion: "0.5.0"\nport: 3000');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(2);
  });

  it('reports multiple findings in the same file', () => {
    const cwd = createTempProject();
    writeTextFile(
      cwd,
      '.github/workflows/ci.yml',
      'uses: actions/checkout@v3.5.0\nuses: actions/setup-node@v3.5.0',
    );

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(2);
  });

  it('always skips CHANGELOG.md and lockfiles', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'CHANGELOG.md', '## [0.5.0] - 2026-01-01\nversion = "0.5.0"');
    writeTextFile(cwd, 'yarn.lock', 'version "0.5.0"');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(0);
  });

  it('handles prerelease versions in scan patterns', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'src/config.ts', 'const version = "1.0.0-alpha.1";');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(1);
    expect(findings[0].found).toBe('1.0.0-alpha.1');
  });

  it('returns empty array when no version literals are found', () => {
    const cwd = createTempProject();
    writeTextFile(cwd, 'src/index.ts', 'console.log("hello world");');

    const findings = scanRepoForVersions('1.2.3', makeScanConfig(), [], cwd);
    expect(findings).toHaveLength(0);
  });
});
