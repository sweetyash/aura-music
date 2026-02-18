import { useState, useEffect } from "react";
import { Download, Share, MoreVertical, Plus, CheckCircle, Smartphone, Wifi, Zap } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    setIsAndroid(/android/i.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, text: "Lightning fast — loads instantly" },
    { icon: Wifi, text: "Works offline for recent songs" },
    { icon: Smartphone, text: "Full-screen, no browser chrome" },
  ];

  if (isStandalone || installed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Aura is Installed! 🎉</h1>
        <p className="text-muted-foreground text-sm mb-8">
          You can now open Aura directly from your home screen just like Spotify.
        </p>
        <a
          href="/"
          className="px-8 py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30"
        >
          Open Aura Music
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 pt-12 pb-10 min-h-screen">
      {/* App Icon */}
      <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-primary/40 mb-5">
        <img src="/icons/icon-512.png" alt="Aura Music" className="w-full h-full object-cover" />
      </div>

      <h1 className="text-3xl font-black text-foreground mb-1 tracking-tight">Aura Music</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        Install for the full Spotify-like experience
      </p>

      {/* Features */}
      <div className="w-full max-w-sm space-y-3 mb-10">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{text}</p>
          </div>
        ))}
      </div>

      {/* Android — native install prompt */}
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="w-full max-w-sm py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-xl shadow-primary/30 flex items-center justify-center gap-2 mb-6"
        >
          <Download size={20} />
          Install Aura Music
        </button>
      )}

      {/* iOS instructions */}
      {isIOS && (
        <div className="w-full max-w-sm bg-secondary/60 rounded-2xl p-5">
          <p className="text-sm font-bold text-foreground mb-4 text-center">Install on iPhone / iPad</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tap the Share button</p>
                <div className="flex items-center gap-1 mt-1">
                  <Share size={14} className="text-primary" />
                  <span className="text-xs text-muted-foreground">at the bottom of Safari</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tap "Add to Home Screen"</p>
                <div className="flex items-center gap-1 mt-1">
                  <Plus size={14} className="text-primary" />
                  <span className="text-xs text-muted-foreground">scroll down in the share sheet</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tap "Add" to confirm</p>
                <p className="text-xs text-muted-foreground mt-1">Aura appears on your home screen!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Android (no prompt yet) */}
      {isAndroid && !deferredPrompt && (
        <div className="w-full max-w-sm bg-secondary/60 rounded-2xl p-5">
          <p className="text-sm font-bold text-foreground mb-4 text-center">Install on Android</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tap the menu button</p>
                <div className="flex items-center gap-1 mt-1">
                  <MoreVertical size={14} className="text-primary" />
                  <span className="text-xs text-muted-foreground">top right of Chrome</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tap "Add to Home screen"</p>
                <p className="text-xs text-muted-foreground mt-1">or "Install app"</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Tap "Add" to confirm</p>
                <p className="text-xs text-muted-foreground mt-1">Aura appears on your home screen!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop fallback */}
      {!isIOS && !isAndroid && !deferredPrompt && (
        <div className="w-full max-w-sm bg-secondary/60 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-foreground mb-2">Install on Desktop</p>
          <p className="text-xs text-muted-foreground mb-3">
            Click the install icon <strong>⊕</strong> in the address bar of Chrome / Edge, or open this page on your phone to install as a mobile app.
          </p>
        </div>
      )}

      <a href="/" className="mt-6 text-sm text-muted-foreground underline underline-offset-2">
        Continue in browser
      </a>
    </div>
  );
};

export default Install;
