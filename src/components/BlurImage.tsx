import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { resizedImage, isSupabasePublicStorage } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  originalSrc?: string;
  /** Width of the tiny blurred placeholder (Supabase-transformed). */
  placeholderWidth?: number;
  /** Container className (the wrapper that reserves the aspect ratio). */
  wrapperClassName?: string;
};

/**
 * Image with a blurred low-res placeholder underneath, fading in on load.
 * The wrapper should reserve the final dimensions (aspect-ratio or width/height)
 * to avoid layout shifts.
 */
const BlurImage = ({
  src,
  originalSrc,
  placeholderWidth = 20,
  wrapperClassName,
  className,
  onLoad,
  onError,
  alt = "",
  ...imgProps
}: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallback = originalSrc || src;
  // Skip the blurred preview on Save-Data / 2g — the extra request is more
  // expensive than the benefit on slow phones.
  const conn = typeof navigator !== "undefined" ? (navigator as any).connection : undefined;
  const lite = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ""));
  const placeholder = !lite && isSupabasePublicStorage(fallback)
    ? resizedImage(fallback, placeholderWidth, 30)
    : undefined;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-muted", wrapperClassName)}
    >
      {placeholder && !failed && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-500",
            loaded ? "opacity-0" : "opacity-100",
          )}
          style={{
            backgroundImage: `url(${placeholder})`,
            filter: "blur(18px)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {!placeholder && !loaded && (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <img
        {...imgProps}
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e: SyntheticEvent<HTMLImageElement>) => {
          setFailed(true);
          setLoaded(true);
          onError?.(e);
        }}
      />
    </div>
  );
};

export default BlurImage;
