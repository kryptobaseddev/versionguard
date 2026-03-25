import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { GitTagSource } from '../sources/git-tag';
import { JsonVersionSource } from '../sources/json';
import { RegexVersionSource } from '../sources/regex';
import { detectManifests, resolveVersionSource } from '../sources/resolve';
import { TomlVersionSource } from '../sources/toml';
import { VersionFileSource } from '../sources/version-file';
import { YamlVersionSource } from '../sources/yaml';
import { createTempProject, initGitRepo, writeTextFile } from './test-utils';

describe('version source providers', () => {
  describe('JsonVersionSource', () => {
    it('reads and writes version from package.json', () => {
      const cwd = createTempProject();
      const source = new JsonVersionSource('package.json', 'version');

      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('1.2.3');

      source.setVersion('2.0.0', cwd);
      expect(source.getVersion(cwd)).toBe('2.0.0');
    });

    it('reads and writes version from composer.json', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'composer.json', JSON.stringify({ version: '3.0.0' }, null, 2));

      const source = new JsonVersionSource('composer.json', 'version');
      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('3.0.0');

      source.setVersion('3.1.0', cwd);
      expect(source.getVersion(cwd)).toBe('3.1.0');
    });

    it('throws when manifest file is missing', () => {
      const cwd = createTempProject();
      const source = new JsonVersionSource('composer.json', 'version');

      expect(source.exists(cwd)).toBe(false);
      expect(() => source.getVersion(cwd)).toThrow('composer.json not found');
    });

    it('throws when version field is missing', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'package.json', JSON.stringify({ name: 'test' }, null, 2));

      const source = new JsonVersionSource('package.json', 'version');
      expect(() => source.getVersion(cwd)).toThrow('No version field');
    });
  });

  describe('TomlVersionSource', () => {
    it('reads and writes version from Cargo.toml', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'Cargo.toml',
        `[package]\nname = "my-crate"\nversion = "0.1.0"\nedition = "2021"\n`,
      );

      const source = new TomlVersionSource('Cargo.toml', 'package.version');
      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('0.1.0');

      source.setVersion('0.2.0', cwd);
      expect(source.getVersion(cwd)).toBe('0.2.0');

      // Verify formatting is preserved
      const content = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
      expect(content).toContain('[package]');
      expect(content).toContain('name = "my-crate"');
      expect(content).toContain('edition = "2021"');
    });

    it('handles single-quoted TOML values', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'Cargo.toml', `[package]\nname = 'my-crate'\nversion = '0.1.0'\n`);

      const source = new TomlVersionSource('Cargo.toml', 'package.version');
      expect(source.getVersion(cwd)).toBe('0.1.0');

      source.setVersion('0.2.0', cwd);
      expect(source.getVersion(cwd)).toBe('0.2.0');

      // Verify single quotes are preserved
      const content = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
      expect(content).toContain("version = '0.2.0'");
    });

    it('reads and writes version from pyproject.toml', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'pyproject.toml',
        `[project]\nname = "my-package"\nversion = "1.0.0"\n\n[build-system]\nrequires = ["setuptools"]\n`,
      );

      const source = new TomlVersionSource('pyproject.toml', 'project.version');
      expect(source.getVersion(cwd)).toBe('1.0.0');

      source.setVersion('1.1.0', cwd);
      expect(source.getVersion(cwd)).toBe('1.1.0');
    });

    it('throws when version field is missing', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'Cargo.toml', `[package]\nname = "my-crate"\n`);

      const source = new TomlVersionSource('Cargo.toml', 'package.version');
      expect(() => source.getVersion(cwd)).toThrow("No version field at 'package.version'");
    });

    it('throws when manifest file is missing', () => {
      const cwd = createTempProject();
      const source = new TomlVersionSource('Cargo.toml', 'package.version');

      expect(source.exists(cwd)).toBe(false);
      expect(() => source.getVersion(cwd)).toThrow('Cargo.toml not found');
    });
  });

  describe('YamlVersionSource', () => {
    it('reads and writes version from pubspec.yaml', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'pubspec.yaml',
        `name: my_app\nversion: 1.0.0+1\ndescription: A test app\n`,
      );

      const source = new YamlVersionSource('pubspec.yaml', 'version');
      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('1.0.0+1');

      source.setVersion('2.0.0+1', cwd);
      expect(source.getVersion(cwd)).toBe('2.0.0+1');

      // Verify other content preserved
      const content = fs.readFileSync(path.join(cwd, 'pubspec.yaml'), 'utf-8');
      expect(content).toContain('name: my_app');
      expect(content).toContain('description: A test app');
    });

    it('throws when version field is missing', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'pubspec.yaml', `name: my_app\n`);

      const source = new YamlVersionSource('pubspec.yaml', 'version');
      expect(() => source.getVersion(cwd)).toThrow('No version field');
    });
  });

  describe('VersionFileSource', () => {
    it('reads and writes from a VERSION file', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'VERSION', '1.0.0\n');

      const source = new VersionFileSource('VERSION');
      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('1.0.0');

      source.setVersion('1.1.0', cwd);
      expect(source.getVersion(cwd)).toBe('1.1.0');
    });

    it('throws when file is empty', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'VERSION', '');

      const source = new VersionFileSource('VERSION');
      expect(() => source.getVersion(cwd)).toThrow('VERSION is empty');
    });
  });

  describe('RegexVersionSource', () => {
    it('reads and writes version from a gemspec file', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'my_gem.gemspec',
        `Gem::Specification.new do |s|\n  s.name = "my_gem"\n  s.version = "1.0.0"\n  s.summary = "A gem"\nend\n`,
      );

      const source = new RegexVersionSource('my_gem.gemspec', '\\.version\\s*=\\s*"([^"]+)"');
      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('1.0.0');

      source.setVersion('1.1.0', cwd);
      expect(source.getVersion(cwd)).toBe('1.1.0');

      // Verify surrounding content preserved
      const content = fs.readFileSync(path.join(cwd, 'my_gem.gemspec'), 'utf-8');
      expect(content).toContain('s.name = "my_gem"');
      expect(content).toContain('s.summary = "A gem"');
    });

    it('reads version from build.gradle', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'build.gradle',
        `plugins {\n    id 'java'\n}\n\nversion = '2.0.0'\n\nrepositories {\n    mavenCentral()\n}\n`,
      );

      const source = new RegexVersionSource('build.gradle', 'version\\s*=\\s*[\'"]([^\'"]+)[\'"]');
      expect(source.getVersion(cwd)).toBe('2.0.0');
    });

    it('reads version from mix.exs', () => {
      const cwd = createTempProject();
      writeTextFile(
        cwd,
        'mix.exs',
        `defmodule MyApp.MixProject do\n  use Mix.Project\n\n  def project do\n    [\n      app: :my_app,\n      version: "0.1.0"\n    ]\n  end\nend\n`,
      );

      const source = new RegexVersionSource('mix.exs', 'version:\\s*"([^"]+)"');
      expect(source.getVersion(cwd)).toBe('0.1.0');
    });

    it('throws when no match found', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'mix.exs', `defmodule MyApp do\nend\n`);

      const source = new RegexVersionSource('mix.exs', 'version:\\s*"([^"]+)"');
      expect(() => source.getVersion(cwd)).toThrow('No version match found');
    });
  });

  describe('GitTagSource', () => {
    it('reads version from git tags', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      execFileSync('git', ['tag', '-a', 'v1.0.0', '-m', 'Release 1.0.0'], {
        cwd,
        stdio: 'ignore',
      });

      const source = new GitTagSource();
      expect(source.exists(cwd)).toBe(true);
      expect(source.getVersion(cwd)).toBe('1.0.0');
    });

    it('strips v prefix from tags', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);
      execFileSync('git', ['tag', '-a', 'v2.5.0', '-m', 'Release 2.5.0'], {
        cwd,
        stdio: 'ignore',
      });

      const source = new GitTagSource();
      expect(source.getVersion(cwd)).toBe('2.5.0');
    });

    it('throws when no tags exist', () => {
      const cwd = createTempProject();
      initGitRepo(cwd);

      const source = new GitTagSource();
      expect(() => source.getVersion(cwd)).toThrow('No git tags found');
    });

    it('returns false for non-git directories', () => {
      const cwd = createTempProject();

      const source = new GitTagSource();
      expect(source.exists(cwd)).toBe(false);
    });
  });

  describe('resolveVersionSource', () => {
    it('auto-detects package.json', () => {
      const cwd = createTempProject();
      const provider = resolveVersionSource({ source: 'auto' }, cwd);

      expect(provider.name).toBe('package.json');
      expect(provider.getVersion(cwd)).toBe('1.2.3');
    });

    it('auto-detects Cargo.toml when no package.json exists', () => {
      const cwd = createTempProject();
      fs.unlinkSync(path.join(cwd, 'package.json'));
      writeTextFile(cwd, 'Cargo.toml', `[package]\nname = "my-crate"\nversion = "0.5.0"\n`);

      const provider = resolveVersionSource({ source: 'auto' }, cwd);
      expect(provider.name).toBe('Cargo.toml');
      expect(provider.getVersion(cwd)).toBe('0.5.0');
    });

    it('auto-detects pyproject.toml', () => {
      const cwd = createTempProject();
      fs.unlinkSync(path.join(cwd, 'package.json'));
      writeTextFile(cwd, 'pyproject.toml', `[project]\nname = "my-pkg"\nversion = "2.0.0"\n`);

      const provider = resolveVersionSource({ source: 'auto' }, cwd);
      expect(provider.name).toBe('pyproject.toml');
      expect(provider.getVersion(cwd)).toBe('2.0.0');
    });

    it('uses explicit source when configured', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'Cargo.toml', `[package]\nname = "my-crate"\nversion = "0.5.0"\n`);

      // Even though package.json exists, explicit config wins
      const provider = resolveVersionSource({ source: 'Cargo.toml' }, cwd);
      expect(provider.name).toBe('Cargo.toml');
      expect(provider.getVersion(cwd)).toBe('0.5.0');
    });

    it('supports custom path override', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'pyproject.toml', `[tool.poetry]\nname = "my-pkg"\nversion = "3.0.0"\n`);

      const provider = resolveVersionSource(
        { source: 'pyproject.toml', path: 'tool.poetry.version' },
        cwd,
      );
      expect(provider.getVersion(cwd)).toBe('3.0.0');
    });

    it('falls back to package.json when nothing detected', () => {
      const cwd = createTempProject();
      fs.unlinkSync(path.join(cwd, 'package.json'));

      const provider = resolveVersionSource({ source: 'auto' }, cwd);
      expect(provider.name).toBe('package.json');
      expect(() => provider.getVersion(cwd)).toThrow();
    });
  });

  describe('security', () => {
    it('rejects path traversal in custom manifest paths (C-002)', () => {
      const cwd = createTempProject();
      expect(() =>
        resolveVersionSource({ source: 'custom', path: '../../../etc/passwd', regex: '(.+)' }, cwd),
      ).toThrow('resolves outside the project directory');
    });

    it('rejects absolute paths in custom manifest (C-002)', () => {
      const cwd = createTempProject();
      expect(() =>
        resolveVersionSource({ source: 'custom', path: '/etc/shadow', regex: '(.+)' }, cwd),
      ).toThrow('resolves outside the project directory');
    });

    it('rejects regex without capture group (C-001)', () => {
      const cwd = createTempProject();
      expect(() =>
        resolveVersionSource({ source: 'custom', path: 'VERSION', regex: '\\d+' }, cwd),
      ).toThrow('must contain at least one capture group');
    });

    it('rejects invalid regex syntax', () => {
      const cwd = createTempProject();
      expect(() =>
        resolveVersionSource({ source: 'custom', path: 'VERSION', regex: '[invalid' }, cwd),
      ).toThrow('Invalid version regex');
    });

    it('rejects invalid manifest source type (H-006)', () => {
      const cwd = createTempProject();
      expect(() => resolveVersionSource({ source: 'requirements.txt' as 'custom' }, cwd)).toThrow(
        'Invalid manifest source',
      );
    });
  });

  describe('detectManifests', () => {
    it('detects multiple manifests in a polyglot project', () => {
      const cwd = createTempProject();
      writeTextFile(cwd, 'Cargo.toml', `[package]\nversion = "0.1.0"\n`);
      writeTextFile(cwd, 'pyproject.toml', `[project]\nversion = "1.0.0"\n`);

      const detected = detectManifests(cwd);
      expect(detected).toContain('package.json');
      expect(detected).toContain('Cargo.toml');
      expect(detected).toContain('pyproject.toml');
    });

    it('returns empty array when no manifests found', () => {
      const cwd = createTempProject();
      fs.unlinkSync(path.join(cwd, 'package.json'));

      expect(detectManifests(cwd)).toEqual([]);
    });
  });
});
