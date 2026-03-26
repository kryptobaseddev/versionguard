import { describe, expect, it } from 'vitest';

import { validateModifier } from '../scheme-rules';
import type { SchemeRules } from '../types';

const rules: SchemeRules = {
  maxNumericSegments: 3,
  allowedModifiers: ['dev', 'alpha', 'beta', 'rc'],
};

describe('validateModifier', () => {
  it('returns null when modifier is allowed', () => {
    expect(validateModifier('alpha', rules)).toBeNull();
    expect(validateModifier('beta.1', rules)).toBeNull();
    expect(validateModifier('rc2', rules)).toBeNull();
    expect(validateModifier('dev', rules)).toBeNull();
  });

  it('returns error when modifier is disallowed', () => {
    const error = validateModifier('gamma', rules);
    expect(error).not.toBeNull();
    expect(error?.severity).toBe('error');
    expect(error?.message).toContain('not allowed');
  });

  it('strips trailing digits before checking', () => {
    expect(validateModifier('alpha1', rules)).toBeNull();
    expect(validateModifier('rc2', rules)).toBeNull();
    expect(validateModifier('gamma1', rules)).not.toBeNull();
  });

  it('strips trailing dots and digits', () => {
    expect(validateModifier('alpha.1', rules)).toBeNull();
    expect(validateModifier('beta.2.3', rules)).toBeNull();
  });

  it('returns null when no schemeRules provided', () => {
    expect(validateModifier('anything', undefined)).toBeNull();
  });

  it('returns null when allowedModifiers is undefined', () => {
    expect(validateModifier('anything', { maxNumericSegments: 3 } as SchemeRules)).toBeNull();
  });

  it('returns null for empty modifier string', () => {
    expect(validateModifier('', rules)).toBeNull();
  });
});
