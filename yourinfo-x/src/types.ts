// Shared types for YourInfo X

export interface ClientInfo {
  // Screen and window
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  windowWidth: number;
  windowHeight: number;

  // System
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;

  // Hardware
  cpuCores: number;
  deviceMemory: number | null;
  maxTouchPoints: number;

  // GPU / WebGL
  gpuVendor: string | null;
  gpuRenderer: string | null;

  // Battery
  batteryLevel: number | null;
  batteryCharging: boolean | null;

  // Connection
  connectionType: string | null;
  downlink: number | null;
  rtt: number | null;

  // Fingerprints
  canvasHash: string;
  webglHash: string;
  audioHash: string;
  mathHash: string;
  fonts: string[];

  // Capabilities
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  globalPrivacyControl: boolean | null;
  incognitoLikely: boolean | null;
  adBlockerLikely: boolean;
  webrtcLocalIPs: string[];

  // Preferences
  prefersColorScheme: string;
  prefersReducedMotion: boolean;
  colorGamut: string;

  // Browser
  browserName: string;
  browserVersion: string;
  userAgent: string;

  // Derived identity
  fingerprintId: string;
  confidence: number;
}

export interface BehaviorData {
  mouseSpeed: number;
  mouseDistance: number;
  clicks: number;
  rageClicks: number;
  scrollDepth: number;
  scrollChanges: number;
  keyPresses: number;
  typingSpeed: number;
  tabSwitches: number;
  focusTimeMs: number;
  humanScore: number;
}

// Enriched server response from /api/geo
export interface GeoBundle {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  timezone: string;
  isp: string;
  vpnLikely: boolean;
  // Enrichment from the four blended APIs
  weather: {
    tempC: number;
    description: string;
    windKph: number;
    isDay: boolean;
  } | null;
  countryMeta: {
    flag: string;
    population: number;
    currencyCode: string;
    currencyName: string;
    callingCode: string;
    languages: string[];
  } | null;
  forex: {
    base: string;
    rateToUsd: number;
  } | null;
  sun: {
    sunrise: string;
    sunset: string;
  } | null;
}

export interface AiDossier {
  occupation: string;
  ageRange: string;
  incomeLevel: string;
  techSavvy: string;
  personalityTraits: string[];
  inferredInterests: string[];
  creepyInsights: string[];
  source: string;
}

export interface AuctionBid {
  bidder: string;
  cpm: number;
  status: 'bid' | 'no-bid';
  reason: string;
}

export interface AuctionResult {
  bids: AuctionBid[];
  estimatedValue: number;
  source: string;
}

// A live visitor point for the globe
export interface VisitorPoint {
  id: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}
