import { useEffect, useState } from "react";

const AD_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}body{display:flex;align-items:center;justify-content:center;}</style></head><body><script type="text/javascript">
  atOptions = {
    'key' : '6f71c73314222fb785a6dceac87cb227',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
<\/script>
<script type="text/javascript" src="https://smelthrsfranz.com/6f71c73314222fb785a6dceac87cb227/invoke.js"><\/script>
</body></html>`;

interface Props { hidden: boolean }

const ReaderBannerAd = ({ hidden }: Props) => {
  // Refresh every 60s, but only while the ad is actually visible and the tab is foregrounded.
  // This avoids wasted network/CPU work on mobile when the user is reading or has switched tabs.
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (hidden) return;
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (t) return;
      t = setInterval(() => {
        if (document.visibilityState === "visible") setNonce((n) => n + 1);
      }, 60_000);
    };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    if (document.visibilityState === "visible") start();
    const onVis = () => { document.visibilityState === "visible" ? start() : stop(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [hidden]);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed left-1/2 top-2 z-10 -translate-x-1/2 transition-opacity duration-200 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{ width: 320, height: 50 }}
    >
      {/* Don't mount the iframe at all while hidden — saves a network request and a JS context on weak phones. */}
      {!hidden && (
        <iframe
          key={nonce}
          title="ad"
          srcDoc={AD_HTML}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          scrolling="no"
          loading="lazy"
          style={{ width: 320, height: 50, border: 0, display: "block", background: "transparent" }}
        />
      )}
    </div>
  );
};

export default ReaderBannerAd;
