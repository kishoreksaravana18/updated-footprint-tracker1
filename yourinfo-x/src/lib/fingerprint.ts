// Client side fingerprinting. Everything here runs in the browser with no
// permission prompts. It demonstrates what a site can read about a visitor
// the moment the page loads.

import type { ClientInfo } from '../types';

// Small synchronous string hash (FNV-1a style) so we never depend on async crypto
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unavailable';
    ctx.textBaseline = 'top';
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('YourInfo X \u{1F50D} fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('YourInfo X \u{1F50D} fingerprint', 4, 17);
    return hash(canvas.toDataURL());
  } catch {
    return 'blocked';
  }
}

function getWebGL(): { hash: string; vendor: string | null; renderer: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { hash: 'unavailable', vendor: null, renderer: null };

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbg ? (gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) as string) : null;
    const renderer = dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) : null;

    const parts = [
      gl.getParameter(gl.VERSION),
      gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      (gl.getSupportedExtensions() || []).join(','),
      vendor,
      renderer,
    ].join('|');

    return { hash: hash(parts), vendor, renderer };
  } catch {
    return { hash: 'blocked', vendor: null, renderer: null };
  }
}

async function getAudioHash(): Promise<string> {
  try {
    const Ctx =
      (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
        .OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return 'unavailable';

    const ctx = new Ctx(1, 5000, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0).slice(0, 1000);
    let sum = 0;
    for (const v of data) sum += Math.abs(v);
    return hash(sum.toString());
  } catch {
    return 'blocked';
  }
}

function getMathHash(): string {
  // Floating point and transcendental results differ subtly across JS engines
  const probes = [
    Math.tan(-1e300),
    Math.sin(1e10),
    Math.cos(1e13),
    Math.atan(2),
    Math.exp(1.2),
    Math.sinh(1),
    Math.pow(Math.PI, -100),
  ];
  return hash(probes.join(','));
}

function detectFonts(): string[] {
  const candidates = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia',
    'Verdana', 'Tahoma', 'Trebuchet MS', 'Comic Sans MS', 'Impact',
    'Calibri', 'Cambria', 'Segoe UI', 'Roboto', 'San Francisco',
    'Menlo', 'Monaco', 'Consolas', 'Ubuntu', 'Noto Sans',
  ];
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';

  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.left = '-9999px';
  span.style.fontSize = testSize;
  span.textContent = testString;
  document.body.appendChild(span);

  const baseline: Record<string, { w: number; h: number }> = {};
  for (const base of baseFonts) {
    span.style.fontFamily = base;
    baseline[base] = { w: span.offsetWidth, h: span.offsetHeight };
  }

  const detected: string[] = [];
  for (const font of candidates) {
    let found = false;
    for (const base of baseFonts) {
      span.style.fontFamily = `'${font}',${base}`;
      if (
        span.offsetWidth !== baseline[base].w ||
        span.offsetHeight !== baseline[base].h
      ) {
        found = true;
        break;
      }
    }
    if (found) detected.push(font);
  }
  document.body.removeChild(span);
  return detected;
}

async function getBattery(): Promise<{ level: number | null; charging: boolean | null }> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (!nav.getBattery) return { level: null, charging: null };
    const b = await nav.getBattery();
    return { level: Math.round(b.level * 100), charging: b.charging };
  } catch {
    return { level: null, charging: null };
  }
}

function getConnection(): { type: string | null; downlink: number | null; rtt: number | null } {
  const c = (navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  }).connection;
  if (!c) return { type: null, downlink: null, rtt: null };
  return { type: c.effectiveType || null, downlink: c.downlink ?? null, rtt: c.rtt ?? null };
}

async function detectIncognito(): Promise<boolean | null> {
  try {
    const quota = await navigator.storage?.estimate?.();
    if (quota && typeof quota.quota === 'number') {
      // Private windows usually report a much smaller quota
      return quota.quota < 120 * 1024 * 1024;
    }
    return null;
  } catch {
    return null;
  }
}

function detectAdBlocker(): Promise<boolean> {
  return new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner ad-placement';
    bait.style.cssText = 'position:absolute;left:-9999px;height:10px;width:10px;';
    document.body.appendChild(bait);
    window.setTimeout(() => {
      const blocked = bait.offsetHeight === 0 || bait.clientHeight === 0;
      bait.remove();
      resolve(blocked);
    }, 80);
  });
}

function getWebRTCIPs(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips = new Set<string>();
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          resolve([...ips]);
          return;
        }
        const m = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
        if (m && !m[1].startsWith('0.')) ips.add(m[1]);
      };
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => resolve([]));
      window.setTimeout(() => {
        pc.close();
        resolve([...ips]);
      }, 600);
    } catch {
      resolve([]);
    }
  });
}

function parseBrowser(ua: string): { name: string; version: string } {
  const tests: [string, RegExp][] = [
    ['Edge', /Edg\/([\d.]+)/],
    ['Opera', /OPR\/([\d.]+)/],
    ['Chrome', /Chrome\/([\d.]+)/],
    ['Firefox', /Firefox\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of tests) {
    const m = re.exec(ua);
    if (m) return { name, version: m[1] };
  }
  return { name: 'Unknown', version: '0' };
}

export async function collectClientInfo(): Promise<ClientInfo> {
  const ua = navigator.userAgent;
  const browser = parseBrowser(ua);
  const webgl = getWebGL();

  const [battery, audioHash, incognito, adBlocker, webrtcIPs] = await Promise.all([
    getBattery(),
    getAudioHash(),
    detectIncognito(),
    detectAdBlocker(),
    getWebRTCIPs(),
  ]);

  const conn = getConnection();
  const canvasHash = getCanvasHash();
  const mathHash = getMathHash();
  const fonts = detectFonts();

  const deviceMemory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;

  const gpc =
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ?? null;

  const info: Omit<ClientInfo, 'fingerprintId' | 'confidence'> = {
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    platform: navigator.platform,
    language: navigator.language,
    languages: [...navigator.languages],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cpuCores: navigator.hardwareConcurrency || 0,
    deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    gpuVendor: webgl.vendor,
    gpuRenderer: webgl.renderer,
    batteryLevel: battery.level,
    batteryCharging: battery.charging,
    connectionType: conn.type,
    downlink: conn.downlink,
    rtt: conn.rtt,
    canvasHash,
    webglHash: webgl.hash,
    audioHash,
    mathHash,
    fonts,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    globalPrivacyControl: gpc,
    incognitoLikely: incognito,
    adBlockerLikely: adBlocker,
    webrtcLocalIPs: webrtcIPs,
    prefersColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    colorGamut: window.matchMedia('(color-gamut: p3)').matches ? 'p3' : 'srgb',
    browserName: browser.name,
    browserVersion: browser.version,
    userAgent: ua,
  };

  // The fingerprint id mixes the stable signals. The more distinctive signals
  // resolve, the higher the confidence.
  const stable = [
    info.canvasHash,
    info.webglHash,
    info.audioHash,
    info.mathHash,
    info.gpuRenderer || '',
    info.fonts.join(','),
    info.timezone,
    `${info.screenWidth}x${info.screenHeight}x${info.colorDepth}`,
    `${info.cpuCores}-${info.deviceMemory}`,
    info.languages.join(','),
  ].join('::');

  const resolved = [
    info.canvasHash !== 'blocked' && info.canvasHash !== 'unavailable',
    info.webglHash !== 'blocked' && info.webglHash !== 'unavailable',
    info.audioHash !== 'blocked' && info.audioHash !== 'unavailable',
    Boolean(info.gpuRenderer),
    info.fonts.length > 4,
  ].filter(Boolean).length;

  return {
    ...info,
    fingerprintId: hash(stable),
    confidence: Math.min(99, 55 + resolved * 9),
  };
}
