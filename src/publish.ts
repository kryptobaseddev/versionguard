/**
 * Registry publish status verification.
 *
 * Checks whether a package version has been published to its ecosystem registry.
 * Supports npm (via execFileSync), crates.io, PyPI, Packagist, pub.dev, and Maven Central (via fetch).
 *
 * @packageDocumentation
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ManifestSourceType, PublishCheckResult, PublishConfig } from './types';

/**
 * Maps manifest source types to their registry check implementations.
 *
 * @remarks
 * Each entry provides the registry name and a check function that returns
 * whether the given version is published. The check function receives the
 * package name, version, and publish config.
 *
 * @public
 * @since 1.0.0
 */
export const REGISTRY_TABLE: Record<
  string,
  {
    registry: string;
    check: (
      packageName: string,
      version: string,
      config: PublishConfig,
    ) => Promise<PublishCheckResult> | PublishCheckResult;
  }
> = {
  'package.json': {
    registry: 'npm',
    check: checkNpmPublished,
  },
  'Cargo.toml': {
    registry: 'crates.io',
    check: checkHttpRegistry(
      'crates.io',
      (name, version) =>
        `https://crates.io/api/v1/crates/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    ),
  },
  'pyproject.toml': {
    registry: 'pypi',
    check: checkHttpRegistry(
      'pypi',
      (name, version) =>
        `https://pypi.org/pypi/${encodeURIComponent(name)}/${encodeURIComponent(version)}/json`,
    ),
  },
  'composer.json': {
    registry: 'packagist',
    check: checkHttpRegistry(
      'packagist',
      (name) => `https://repo.packagist.org/p2/${encodeURIComponent(name)}.json`,
      // Packagist returns all versions in one response — check if version is included
      (body, version) => {
        try {
          const data = JSON.parse(body) as {
            packages?: Record<string, Array<{ version: string }>>;
          };
          const packages = data.packages;
          if (!packages) return false;
          const pkgVersions = Object.values(packages).flat();
          return pkgVersions.some((v) => v.version === version);
        } catch {
          return false;
        }
      },
    ),
  },
  'pubspec.yaml': {
    registry: 'pub.dev',
    check: checkHttpRegistry(
      'pub.dev',
      (name, version) =>
        `https://pub.dev/api/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
    ),
  },
  'pom.xml': {
    registry: 'maven-central',
    check: checkHttpRegistry(
      'maven-central',
      (name, version) =>
        `https://search.maven.org/solrsearch/select?q=a:"${encodeURIComponent(name)}"+AND+v:"${encodeURIComponent(version)}"&rows=1&wt=json`,
      (body) => {
        try {
          const data = JSON.parse(body) as { response?: { numFound: number } };
          return (data.response?.numFound ?? 0) > 0;
        } catch {
          return false;
        }
      },
    ),
  },
};

/** Source types that have no registry to check. */
const SKIP_SOURCES = new Set<ManifestSourceType>(['VERSION', 'git-tag', 'auto', 'custom']);

/**
 * Checks whether a package version has been published to its ecosystem registry.
 *
 * @remarks
 * Uses the REGISTRY_TABLE to dispatch to the correct check implementation
 * based on the detected manifest source type. Fail-open on network errors:
 * returns `published: false` with an error message when the check cannot complete.
 *
 * @param manifestSource - The detected manifest source type.
 * @param packageName - Package name as read from the manifest.
 * @param version - Version string to check.
 * @param config - Publish configuration with timeout and optional registry URL.
 * @returns The publish check result.
 *
 * @example
 * ```ts
 * import { checkPublishStatus } from './publish';
 *
 * const result = await checkPublishStatus('package.json', '@codluv/vg', '1.0.0', { enabled: true, timeout: 5000 });
 * ```
 *
 * @public
 * @since 1.0.0
 */
export async function checkPublishStatus(
  manifestSource: ManifestSourceType,
  packageName: string,
  version: string,
  config: PublishConfig,
): Promise<PublishCheckResult> {
  if (SKIP_SOURCES.has(manifestSource)) {
    return {
      published: false,
      registry: 'none',
      packageName,
    };
  }

  // Validate registryUrl scheme to prevent SSRF via config
  if (config.registryUrl && !/^https?:\/\//i.test(config.registryUrl)) {
    return {
      published: false,
      registry: 'unknown',
      packageName,
      error: `Invalid registry URL scheme — only http:// and https:// are allowed: ${config.registryUrl}`,
    };
  }

  const entry = REGISTRY_TABLE[manifestSource];
  if (!entry) {
    return {
      published: false,
      registry: 'unknown',
      packageName,
    };
  }

  try {
    return await entry.check(packageName, version, config);
  } catch (err) {
    // Fail-open: network errors produce a warning, not a failure
    return {
      published: false,
      registry: entry.registry,
      packageName,
      error: `Publish check failed: ${(err as Error).message}`,
    };
  }
}

/**
 * Checks npm registry using execFileSync (shell-injection safe, inherits .npmrc auth).
 */
function checkNpmPublished(
  packageName: string,
  version: string,
  config: PublishConfig,
): PublishCheckResult {
  try {
    const args = ['view', `${packageName}@${version}`, 'version'];
    if (config.registryUrl) {
      args.push(`--registry=${config.registryUrl}`);
    }

    const result = execFileSync('npm', args, {
      encoding: 'utf-8',
      timeout: config.timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return {
      published: result === version,
      registry: 'npm',
      packageName,
    };
  } catch (err) {
    const message = (err as Error).message || '';
    // npm view exits non-zero when package/version doesn't exist — this is expected
    if (message.includes('E404') || message.includes('is not in this registry')) {
      return {
        published: false,
        registry: 'npm',
        packageName,
      };
    }
    // Any other error is a network/auth issue — fail-open
    return {
      published: false,
      registry: 'npm',
      packageName,
      error: `npm check failed: ${message.split('\n')[0].slice(0, 100)}`,
    };
  }
}

/**
 * Creates an HTTP registry check function using fetch with AbortController timeout.
 */
function checkHttpRegistry(
  registry: string,
  urlBuilder: (name: string, version: string) => string,
  bodyChecker?: (body: string, version: string) => boolean,
): (packageName: string, version: string, config: PublishConfig) => Promise<PublishCheckResult> {
  return async (packageName, version, config) => {
    const url = config.registryUrl
      ? `${config.registryUrl.replace(/\/$/, '')}/${packageName}/${version}`
      : urlBuilder(packageName, version);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (response.status === 404) {
        return { published: false, registry, packageName };
      }

      if (!response.ok) {
        return {
          published: false,
          registry,
          packageName,
          error: `Registry returned HTTP ${response.status}`,
        };
      }

      if (bodyChecker) {
        const body = await response.text();
        return { published: bodyChecker(body, version), registry, packageName };
      }

      return { published: true, registry, packageName };
    } catch (err) {
      const message = (err as Error).message || '';
      if (message.includes('abort')) {
        return {
          published: false,
          registry,
          packageName,
          error: `Registry check timed out after ${config.timeout}ms`,
        };
      }
      return {
        published: false,
        registry,
        packageName,
        error: `Registry check failed: ${message.slice(0, 200)}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Reads the package name from a manifest file for registry lookups.
 *
 * @param manifestSource - Detected manifest type.
 * @param cwd - Project directory.
 * @returns The package name, or null if it cannot be determined.
 *
 * @public
 * @since 1.0.0
 */
export function readPackageName(manifestSource: ManifestSourceType, cwd: string): string | null {
  try {
    switch (manifestSource) {
      case 'package.json': {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')) as {
          name?: string;
        };
        return pkg.name || null;
      }
      case 'Cargo.toml': {
        const content = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
        const match = content.match(/^\s*name\s*=\s*"([^"]+)"/m);
        return match?.[1] || null;
      }
      case 'pyproject.toml': {
        const content = fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf-8');
        const match = content.match(/^\s*name\s*=\s*"([^"]+)"/m);
        return match?.[1] || null;
      }
      case 'composer.json': {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'composer.json'), 'utf-8')) as {
          name?: string;
        };
        return pkg.name || null;
      }
      case 'pubspec.yaml': {
        const content = fs.readFileSync(path.join(cwd, 'pubspec.yaml'), 'utf-8');
        const match = content.match(/^name:\s*(.+)$/m);
        return match?.[1]?.trim() || null;
      }
      case 'pom.xml': {
        const content = fs.readFileSync(path.join(cwd, 'pom.xml'), 'utf-8');
        const match = content.match(/<artifactId>([^<]+)<\/artifactId>/);
        return match?.[1] || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
