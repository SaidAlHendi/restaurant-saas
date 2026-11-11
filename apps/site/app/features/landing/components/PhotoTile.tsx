import { cn } from '@app/ui';

import type { LandingImageName } from '../landing-media.generated.js';
import { Picture } from './Picture.js';

export type PhotoTileProps = {
  image: LandingImageName;
  alt: string;
  caption: string;
  sizes: string;
  /** Grid placement and height. */
  className?: string;
  priority?: boolean;
  /** CSS `object-position` for the crop, e.g. `center 62%`. */
  focus?: string;
};

/** A full-bleed photo tile with a small caption chip. The crop is set with object-position. */
export function PhotoTile({ image, alt, caption, sizes, className, priority, focus }: PhotoTileProps) {
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
      <span className="absolute bottom-3.5 start-3.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background">
        {caption}
      </span>
    </div>
  );
}
