import { defaultVariantIn, withDefaultVariant } from './flag-text';

const flagFile = `{
  "$schema": "https://flagd.dev/schema/v0/flags.json",
  "flags": {
    "productCatalogFailure": {
      "description": "Fail product catalog service on a specific product",
      "state": "ENABLED",
      "variants": {
        "on": true,
        "off": false
      },
      "defaultVariant": "off"
    },
    "recommendationCacheFailure": {
      "description": "Fail recommendation service cache",
      "state": "ENABLED",
      "variants": {
        "on": true,
        "off": false
      },
      "defaultVariant": "off"
    }
  }
}
`;

describe('flag file text edit', () => {
  it('changes only the defaultVariant line of the named flag', () => {
    const released = withDefaultVariant(flagFile, { flag: 'recommendationCacheFailure', variant: 'on' });
    const before = flagFile.split('\n');
    const changed = released.split('\n').filter((line, index) => line !== before[index]);
    expect(changed).toEqual(['      "defaultVariant": "on"']);
    expect(defaultVariantIn(released, 'recommendationCacheFailure')).toBe('on');
    expect(defaultVariantIn(released, 'productCatalogFailure')).toBe('off');
  });

  it('round-trips back to the original text and refuses an unknown flag', () => {
    const released = withDefaultVariant(flagFile, { flag: 'recommendationCacheFailure', variant: 'on' });
    expect(withDefaultVariant(released, { flag: 'recommendationCacheFailure', variant: 'off' })).toBe(flagFile);
    expect(() => withDefaultVariant(flagFile, { flag: 'noSuchFlag', variant: 'on' })).toThrow('noSuchFlag');
    expect(defaultVariantIn(flagFile, 'noSuchFlag')).toBeNull();
  });
});
