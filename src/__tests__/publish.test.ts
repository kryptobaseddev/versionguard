import * as cp from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkPublishStatus, REGISTRY_TABLE, readPackageName } from '../publish';
import type { PublishConfig } from '../types';
import { createTempProject, writeTextFile } from './test-utils';

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof cp>('node:child_process');
  return { ...actual, execFileSync: vi.fn(actual.execFileSync) };
});

const defaultConfig: PublishConfig = {
  enabled: true,
  timeout: 5000,
};

describe('publish', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('REGISTRY_TABLE', () => {
    it('maps known manifest sources to registries', () => {
      expect(REGISTRY_TABLE['package.json'].registry).toBe('npm');
      expect(REGISTRY_TABLE['Cargo.toml'].registry).toBe('crates.io');
      expect(REGISTRY_TABLE['pyproject.toml'].registry).toBe('pypi');
      expect(REGISTRY_TABLE['composer.json'].registry).toBe('packagist');
      expect(REGISTRY_TABLE['pubspec.yaml'].registry).toBe('pub.dev');
      expect(REGISTRY_TABLE['pom.xml'].registry).toBe('maven-central');
    });
  });

  describe('checkPublishStatus', () => {
    it('skips check for VERSION source type', async () => {
      const result = await checkPublishStatus('VERSION', 'test', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.registry).toBe('none');
    });

    it('skips check for git-tag source type', async () => {
      const result = await checkPublishStatus('git-tag', 'test', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.registry).toBe('none');
    });

    it('skips check for auto source type', async () => {
      const result = await checkPublishStatus('auto', 'test', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.registry).toBe('none');
    });

    it('skips check for custom source type', async () => {
      const result = await checkPublishStatus('custom', 'test', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.registry).toBe('none');
    });

    it('returns npm registry for package.json', async () => {
      vi.mocked(cp.execFileSync).mockReturnValue('1.0.0');

      const result = await checkPublishStatus(
        'package.json',
        '@codluv/versionguard',
        '1.0.0',
        defaultConfig,
      );
      expect(result.published).toBe(true);
      expect(result.registry).toBe('npm');
      expect(result.packageName).toBe('@codluv/versionguard');
    });

    it('detects npm not-published (E404)', async () => {
      vi.mocked(cp.execFileSync).mockImplementation(() => {
        throw new Error('E404 - Not Found');
      });

      const result = await checkPublishStatus(
        'package.json',
        '@codluv/versionguard',
        '99.99.99',
        defaultConfig,
      );
      expect(result.published).toBe(false);
      expect(result.registry).toBe('npm');
      expect(result.error).toBeUndefined();
    });

    it('detects npm not in registry', async () => {
      vi.mocked(cp.execFileSync).mockImplementation(() => {
        throw new Error('is not in this registry');
      });

      const result = await checkPublishStatus(
        'package.json',
        'nonexistent-pkg',
        '1.0.0',
        defaultConfig,
      );
      expect(result.published).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('fail-opens on npm network error', async () => {
      vi.mocked(cp.execFileSync).mockImplementation(() => {
        throw new Error('ECONNREFUSED');
      });

      const result = await checkPublishStatus(
        'package.json',
        '@codluv/versionguard',
        '1.0.0',
        defaultConfig,
      );
      expect(result.published).toBe(false);
      expect(result.error).toContain('npm check failed');
    });

    it('passes registryUrl to npm', async () => {
      vi.mocked(cp.execFileSync).mockReturnValue('1.0.0');

      await checkPublishStatus('package.json', 'test', '1.0.0', {
        ...defaultConfig,
        registryUrl: 'https://custom.registry.com',
      });

      expect(cp.execFileSync).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['--registry=https://custom.registry.com']),
        expect.any(Object),
      );
    });

    it('rejects registryUrl with invalid scheme (SSRF prevention)', async () => {
      const result = await checkPublishStatus('package.json', 'test', '1.0.0', {
        ...defaultConfig,
        registryUrl: 'file:///etc/passwd',
      });
      expect(result.published).toBe(false);
      expect(result.error).toContain('Invalid registry URL scheme');
    });

    it('allows registryUrl with https scheme', async () => {
      vi.mocked(cp.execFileSync).mockReturnValue('1.0.0');

      const result = await checkPublishStatus('package.json', 'test', '1.0.0', {
        ...defaultConfig,
        registryUrl: 'https://registry.npmjs.org',
      });
      expect(result.error).toBeUndefined();
    });

    it('handles HTTP registry 404 (not published)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

      const result = await checkPublishStatus('Cargo.toml', 'my-crate', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.registry).toBe('crates.io');
      expect(result.error).toBeUndefined();
    });

    it('handles HTTP registry 200 (published)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

      const result = await checkPublishStatus('Cargo.toml', 'my-crate', '1.0.0', defaultConfig);
      expect(result.published).toBe(true);
      expect(result.registry).toBe('crates.io');
    });

    it('fail-opens on HTTP timeout (abort)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('The operation was aborted'));

      const result = await checkPublishStatus('pyproject.toml', 'my-pkg', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('fail-opens on HTTP network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'));

      const result = await checkPublishStatus('pyproject.toml', 'my-pkg', '1.0.0', defaultConfig);
      expect(result.published).toBe(false);
      expect(result.error).toContain('Registry check failed');
    });

    it('handles HTTP registry non-200 status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

      const result = await checkPublishStatus(
        'pubspec.yaml',
        'my-dart-pkg',
        '1.0.0',
        defaultConfig,
      );
      expect(result.published).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });

    it('checks packagist with body checker (version found)', async () => {
      const packagistResponse = JSON.stringify({
        packages: {
          'vendor/pkg': [{ version: '1.0.0' }, { version: '2.0.0' }],
        },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(packagistResponse, { status: 200 }),
      );

      const result = await checkPublishStatus(
        'composer.json',
        'vendor/pkg',
        '1.0.0',
        defaultConfig,
      );
      expect(result.published).toBe(true);
      expect(result.registry).toBe('packagist');
    });

    it('checks packagist with body checker (version not found)', async () => {
      const packagistResponse = JSON.stringify({
        packages: {
          'vendor/pkg': [{ version: '2.0.0' }],
        },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(packagistResponse, { status: 200 }),
      );

      const result = await checkPublishStatus(
        'composer.json',
        'vendor/pkg',
        '1.0.0',
        defaultConfig,
      );
      expect(result.published).toBe(false);
    });

    it('checks maven-central with body checker', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ response: { numFound: 1 } }), { status: 200 }),
      );

      const result = await checkPublishStatus('pom.xml', 'my-artifact', '1.0.0', defaultConfig);
      expect(result.published).toBe(true);
      expect(result.registry).toBe('maven-central');
    });
  });

  describe('readPackageName', () => {
    it('reads name from package.json', () => {
      const cwd = createTempProject();
      expect(readPackageName('package.json', cwd)).toBe('fixture');
    });

    it('reads name from Cargo.toml', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'Cargo.toml', '[package]\nname = "my-crate"\nversion = "1.0.0"\n');
      expect(readPackageName('Cargo.toml', cwd)).toBe('my-crate');
    });

    it('reads name from pyproject.toml', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'pyproject.toml', '[project]\nname = "my-pkg"\nversion = "1.0.0"\n');
      expect(readPackageName('pyproject.toml', cwd)).toBe('my-pkg');
    });

    it('reads name from composer.json', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'composer.json', '{"name": "vendor/pkg", "version": "1.0.0"}\n');
      expect(readPackageName('composer.json', cwd)).toBe('vendor/pkg');
    });

    it('reads name from pubspec.yaml', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'pubspec.yaml', 'name: my_app\nversion: 1.0.0\n');
      expect(readPackageName('pubspec.yaml', cwd)).toBe('my_app');
    });

    it('reads name from pom.xml', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'pom.xml',
        '<project><artifactId>my-artifact</artifactId><version>1.0.0</version></project>',
      );
      expect(readPackageName('pom.xml', cwd)).toBe('my-artifact');
    });

    it('returns null for unsupported types', () => {
      const cwd = createTempProject();
      expect(readPackageName('VERSION', cwd)).toBeNull();
      expect(readPackageName('git-tag', cwd)).toBeNull();
    });

    it('returns null when file is missing', () => {
      const cwd = createTempProject();
      expect(readPackageName('Cargo.toml', cwd)).toBeNull();
    });
  });
});
