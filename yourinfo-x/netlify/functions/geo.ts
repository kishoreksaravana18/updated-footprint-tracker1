// Netlify Function: /api/geo
// Resolves the visitor IP, then enriches it with four free, no-key APIs:
//   - ipwho.is        -> base geolocation (HTTPS, no key)  [fallback: freeipapi.com]
//   - Open-Meteo      -> current weather at the coordinates
//   - REST Countries  -> flag, currency, population, languages, calling code
//   - Frankfurter     -> live exchange rate of local currency to USD
//   - Sunrise-Sunset  -> today's sunrise and sunset for the coordinates
//
// All enrichment runs in parallel and fails soft: if one API is down the rest
// still return.

import type { Handler, HandlerEvent } from '@netlify/functions';
import type { GeoBundle } from '../../src/types';

const JSON_HEADERS: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store' };


function clientIp(event: HandlerEvent): string {
  // Netlify forwards the real client IP in these headers
  const h = event.headers;
  const fwd = h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '';
  return fwd.split(',')[0].trim();
}

async function fetchJson(u: string, ms = 4000): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(u, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function baseGeo(ip: string) {
  // Primary: ipwho.is (HTTPS, no key, returns connection + currency too)
  const a = await fetchJson(`https://ipwho.is/${ip}`);
  if (a && a.success !== false) {
    return {
      ip,
      city: a.city || 'Unknown',
      region: a.region || 'Unknown',
      country: a.country || 'Unknown',
      countryCode: a.country_code || 'XX',
      lat: a.latitude || 0,
      lng: a.longitude || 0,
      timezone: a.timezone?.id || 'UTC',
      isp: a.connection?.isp || a.connection?.org || 'Unknown',
      vpnLikely: Boolean(a.security?.vpn || a.security?.proxy),
    };
  }
  // Fallback: freeipapi.com
  const b = await fetchJson(`https://free.freeipapi.com/api/json/${ip}`);
  if (b) {
    return {
      ip,
      city: b.cityName || 'Unknown',
      region: b.regionName || 'Unknown',
      country: b.countryName || 'Unknown',
      countryCode: b.countryCode || 'XX',
      lat: b.latitude || 0,
      lng: b.longitude || 0,
      timezone: b.timeZone || 'UTC',
      isp: 'Unknown',
      vpnLikely: Boolean(b.isProxy),
    };
  }
  return null;
}

async function getWeather(lat: number, lng: number) {
  const d = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,is_day`,
  );
  if (!d?.current) return null;
  return {
    tempC: Math.round(d.current.temperature_2m),
    description: weatherCodeToText(d.current.weather_code),
    windKph: Math.round(d.current.wind_speed_10m),
    isDay: d.current.is_day === 1,
  };
}

function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
    55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers',
    81: 'Rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
    96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
  };
  return map[code] || 'Unknown';
}

async function getCountryMeta(code: string) {
  if (!code || code === 'XX') return null;
  const arr = await fetchJson(
    `https://restcountries.com/v3.1/alpha/${code}?fields=flag,population,currencies,idd,languages`,
  );
  const c = Array.isArray(arr) ? arr[0] : arr;
  if (!c) return null;
  const currencyCode = c.currencies ? Object.keys(c.currencies)[0] : '';
  const currencyName = currencyCode ? c.currencies[currencyCode]?.name : '';
  const callingCode =
    c.idd?.root && c.idd?.suffixes?.[0] ? `${c.idd.root}${c.idd.suffixes[0]}` : '';
  return {
    flag: c.flag || '',
    population: c.population || 0,
    currencyCode: currencyCode || '',
    currencyName: currencyName || '',
    callingCode,
    languages: c.languages ? Object.values(c.languages as Record<string, string>) : [],
  };
}

async function getForex(currencyCode: string) {
  if (!currencyCode || currencyCode === 'USD') {
    return { base: 'USD', rateToUsd: 1 };
  }
  const d = await fetchJson(
    `https://api.frankfurter.app/latest?from=${currencyCode}&to=USD`,
  );
  if (!d?.rates?.USD) return null;
  return { base: currencyCode, rateToUsd: d.rates.USD };
}

async function getSun(lat: number, lng: number) {
  const d = await fetchJson(
    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`,
  );
  if (d?.status !== 'OK') return null;
  return { sunrise: d.results.sunrise, sunset: d.results.sunset };
}

export const handler: Handler = async (event) => {
  const ip = clientIp(event);
  const base = await baseGeo(ip);

  if (!base) {
    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'geo_unavailable', ip }),
    };
  }

  const [weather, countryMeta, sun] = await Promise.all([
    getWeather(base.lat, base.lng),
    getCountryMeta(base.countryCode),
    getSun(base.lat, base.lng),
  ]);

  const forex = countryMeta ? await getForex(countryMeta.currencyCode) : null;

  const bundle: GeoBundle = { ...base, weather, countryMeta, forex, sun };

  return {
    statusCode: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify(bundle),
  };
};
