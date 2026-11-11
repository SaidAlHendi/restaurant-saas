import { LANDING_IMAGES, type LandingImageName } from '../landing-media.generated.js';
import { imageFallbackSrc, imageSrcSet } from '../landing.utils.js';

export type PictureProps = {
  name: LandingImageName;
  alt: string;
  /** `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes: string;
  /** Above-the-fold image: loaded eagerly with high fetch priority. */
  priority?: boolean;
  className?: string;
  /** CSS `object-position` of the crop, e.g. `center 62%`. */
  objectPosition?: string;
};

/** Responsive AVIF/WebP/JPEG image with intrinsic size set, so it never shifts the layout. */
export function Picture({ name, alt, sizes, priority = false, className, objectPosition }: PictureProps) {
  const meta = LANDING_IMAGES[name];
  return (
    <picture>
      <source type="image/avif" srcSet={imageSrcSet(name, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={imageSrcSet(name, 'webp')} sizes={sizes} />
      <img
        src={imageFallbackSrc(name)}
        srcSet={imageSrcSet(name, 'jpg')}
        sizes={sizes}
        width={meta.width}
        height={meta.height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={className}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </picture>
  );
}
