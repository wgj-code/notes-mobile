/**
 * bumpVersion.test.ts — Mobile 版本号递增脚本测试
 *
 * Tests the version bump logic (mirrors scripts/bump-version.sh logic).
 */

function bumpVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2]++;
  if (parts[2] > 99) {
    parts[2] = 0;
    parts[1]++;
    if (parts[1] > 99) {
      parts[1] = 0;
      parts[0]++;
    }
  }
  return parts.join('.');
}

describe('Mobile version bump', () => {
  it('increments patch: 0.1.0 → 0.1.1', () => {
    expect(bumpVersion('0.1.0')).toBe('0.1.1');
  });

  it('increments patch: 0.1.5 → 0.1.6', () => {
    expect(bumpVersion('0.1.5')).toBe('0.1.6');
  });

  it('rolls over patch to minor: 0.1.99 → 0.2.0', () => {
    expect(bumpVersion('0.1.99')).toBe('0.2.0');
  });

  it('rolls over minor to major: 0.99.99 → 1.0.0', () => {
    expect(bumpVersion('0.99.99')).toBe('1.0.0');
  });

  it('handles initial version: 0.0.0 → 0.0.1', () => {
    expect(bumpVersion('0.0.0')).toBe('0.0.1');
  });
});
