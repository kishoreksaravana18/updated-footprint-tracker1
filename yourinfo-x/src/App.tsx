import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { collectClientInfo } from './lib/fingerprint';
import { createBehaviorTracker } from './lib/behavior';
import type {
  ClientInfo, BehaviorData, GeoBundle, AiDossier, AuctionResult, VisitorPoint,
} from './types';
import { LocationPanel } from './components/LocationPanel';
import { DevicePanel, BrowserPanel, PrivacyPanel } from './components/DevicePanel';
import { BehaviorPanel } from './components/BehaviorPanel';
import { DossierPanel, AuctionPanel } from './components/AiPanels';

const GlobePanel = lazy(() => import('./components/GlobePanel'));

const BOOT_LINES = [
  'establishing connection...',
  'reading device hardware...',
  'computing canvas + webgl + audio fingerprint...',
  'tracing IP and enriching location...',
  'pulling local weather, currency, daylight...',
  'profiling subject with AI...',
  'subject file assembled.',
];

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function App() {
  const [info, setInfo] = useState<ClientInfo | null>(null);
  const [behavior, setBehavior] = useState<BehaviorData | null>(null);
  const [geo, setGeo] = useState<GeoBundle | null>(null);
  const [dossier, setDossier] = useState<AiDossier | null>(null);
  const [auction, setAuction] = useState<AuctionResult | null>(null);
  const [self, setSelf] = useState<VisitorPoint | null>(null);
  const [bootIndex, setBootIndex] = useState(0);
  const ran = useRef(false);

  // Boot line ticker
  useEffect(() => {
    const t = window.setInterval(() => {
      setBootIndex((i) => Math.min(i + 1, BOOT_LINES.length - 1));
    }, 850);
    return () => window.clearInterval(t);
  }, []);

  // Behavior tracker
  useEffect(() => {
    const stop = createBehaviorTracker(setBehavior);
    return stop;
  }, []);

  // Main collection pipeline, runs once
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const client = await collectClientInfo();
      setInfo(client);

      // Geo (and enrichment) from the serverless function
      const g = await fetch('/api/geo').then((r) => r.json()).catch(() => null);
      if (g && !g.error) {
        setGeo(g as GeoBundle);
        setSelf({
          id: client.fingerprintId,
          lat: g.lat,
          lng: g.lng,
          city: g.city,
          country: g.country,
        });
      }

      // Compact payload for the AI calls
      const aiPayload = {
        device: {
          screen: `${client.screenWidth}x${client.screenHeight}`,
          cpuCores: client.cpuCores,
          memoryGB: client.deviceMemory,
          gpu: client.gpuRenderer,
          touch: client.maxTouchPoints,
          battery: client.batteryLevel,
        },
        software: {
          browser: `${client.browserName} ${client.browserVersion}`,
          platform: client.platform,
          languages: client.languages,
          timezone: client.timezone,
          fontsDetected: client.fonts.length,
          colorScheme: client.prefersColorScheme,
        },
        privacy: {
          doNotTrack: client.doNotTrack,
          adBlocker: client.adBlockerLikely,
          vpn: g?.vpnLikely ?? null,
          incognito: client.incognitoLikely,
        },
        location: g && !g.error
          ? { country: g.country, city: g.city, isp: g.isp }
          : null,
      };

      postJson<AiDossier>('/api/profile', aiPayload).then((d) => d && setDossier(d));

      const auctionPayload = {
        ...aiPayload,
        inferredFrom: 'fingerprint',
      };
      postJson<AuctionResult>('/api/auction', auctionPayload).then((a) => a && setAuction(a));
    })();
  }, []);

  return (
    <>
      <header className="hdr">
        <div className="brand">YOUR<b>INFO</b> // X</div>
        <div className="hdr-right">
          <span className="live-dot">live</span>
          <span className="counter">subject <b>#{info?.fingerprintId ?? '------'}</b></span>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div className="eyebrow">Privacy awareness demonstration</div>
          <h1>We built a file on you<br /><span className="red">before you clicked anything.</span></h1>
          <p className="hero-sub">
            No login. No permission prompt. Everything below was read from your browser
            and network the instant this page loaded. Scroll to declassify it.
          </p>

          <div className="subject-line">
            <div>
              <span className="k">Subject ID</span>
              <span className="v amber">#{info?.fingerprintId ?? '------'}</span>
            </div>
            <div>
              <span className="k">Match confidence</span>
              <span className="v">{info ? `${info.confidence}%` : '--'}</span>
            </div>
            <div>
              <span className="k">Located</span>
              <span className="v">{geo ? `${geo.city}, ${geo.countryCode}` : 'tracing...'}</span>
            </div>
          </div>

          <div className="boot">
            {BOOT_LINES.slice(0, bootIndex + 1).map((l, i) => (
              <div key={i}>
                &gt; {l}{i === bootIndex && <span className="cursor"> &#9608;</span>}
              </div>
            ))}
          </div>
        </section>

        <div className="section-label">Location intelligence</div>
        <div className="grid globe">
          <Suspense fallback={<div className="panel"><span className="loading">Rendering the globe</span></div>}>
            <GlobePanel self={self} />
          </Suspense>
          <LocationPanel geo={geo} />
        </div>

        <div className="section-label">Device fingerprint</div>
        {info ? (
          <div className="grid three">
            <DevicePanel info={info} />
            <BrowserPanel info={info} />
            <PrivacyPanel info={info} />
          </div>
        ) : (
          <div className="panel"><span className="loading">Reading your device</span></div>
        )}

        <div className="section-label">Behavior &amp; inference</div>
        <div className="grid two">
          {behavior ? <BehaviorPanel b={behavior} /> : <div className="panel"><span className="loading">Watching how you move</span></div>}
          <DossierPanel dossier={dossier} />
        </div>

        <div className="section-label">What you are worth</div>
        <AuctionPanel auction={auction} />

        <footer className="footer">
          <p>
            <b>YourInfo X</b> is an educational privacy demonstration. Nothing here is stored
            server side beyond the live presence channel. Built with free APIs:
            NVIDIA NIM (Llama 4 Maverick), ipwho.is, Open-Meteo, REST Countries, Frankfurter, Sunrise-Sunset, Supabase.
          </p>
          <p style={{ marginTop: 8 }}>
            Protect yourself: use a VPN, a privacy browser, and an anti-fingerprinting extension.
          </p>
        </footer>
      </main>
    </>
  );
}
