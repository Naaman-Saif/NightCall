import React from 'react';

const CDN = '/icons/';

/** Lucide glyph rendered as a CSS mask so it inherits currentColor. */
export function Icon({ name, size = 16, strokeWidth, color, style, title, ...rest }) {
  const url = 'url("' + CDN + name + '.svg")';
  return (
    <span
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{
        display: 'inline-block', flex: '0 0 auto', width: size, height: size,
        backgroundColor: color || 'currentColor',
        WebkitMaskImage: url, maskImage: url,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        ...style,
      }}
      {...rest}
    />
  );
}
