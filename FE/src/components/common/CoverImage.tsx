'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Music2 } from 'lucide-react';

interface CoverImageProps {
  src?: string | null;
  alt?: string;
  sizes: string;
  className?: string;
  iconSize?: number;
}

/**
 * Renders track or playlist artwork with automatic fallback when an image URL is missing,
 * points to legacy local SVG stubs, or fails to load from remote hosts.
 */
export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  alt = '',
  sizes,
  className = 'object-cover',
  iconSize = 22,
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmed = src?.trim() ?? '';
  const isInvalidOrBroken =
    !trimmed || trimmed.startsWith('/covers/') || failedSrc === trimmed;

  if (isInvalidOrBroken) {
    return (
      <div
        aria-hidden="true"
        className="flex h-full w-full items-center justify-center bg-surface-raised text-slate-500 dark:text-slate-400"
      >
        <Music2 size={iconSize} strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized
      onError={() => setFailedSrc(trimmed)}
    />
  );
};
