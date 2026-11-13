import { cn } from '@app/ui';

import type { LandingImageName } from '../landing-media.generated.js';
import { Picture } from './Picture.js';

export type PhotoTileProps = {
  image: LandingImageName;
  alt: string;
  sizes: string;
  /** Grid placement and height. */
  className?: string;
  priority?: boolean;
  /** CSS `object-position` for the crop, e.g. `center 62%`. */
  focus?: string;
};

/** A full-bleed photo tile . The crop is set with object-position. */
export function PhotoTile({ image, alt, sizes, className, priority, focus }: PhotoTileProps) {
  return (
    <div
      className={cn(
        'relative col-span-12 min-h-[300px] overflow-hidden rounded-[10px] bg-card',
        className,
      )}
    >
      <Picture
        name={image}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className="absolute inset-0 size-full object-cover"
        objectPosition={focus}
      />
    </div>
  );
}
