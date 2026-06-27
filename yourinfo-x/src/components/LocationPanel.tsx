import type { GeoBundle } from '../types';
import { Redact } from './Reveal';

function fmtTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    });
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
}

export function LocationPanel({ geo }: { geo: GeoBundle | null }) {
  if (!geo) {
    return (
      <div className="panel">
        <p className="panel-title">Location <span className="tag">network</span></p>
        <span className="loading">Tracing your connection</span>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="panel-title">
        Location <span className="tag">{geo.countryMeta?.flag || ''} {geo.countryCode}</span>
      </p>

      <div className="row"><span className="k">IP address</span><span className="v"><Redact>{geo.ip || 'hidden'}</Redact></span></div>
      <div className="row"><span className="k">City</span><span className="v">{geo.city}, {geo.region}</span></div>
      <div className="row"><span className="k">Coordinates</span><span className="v">{geo.lat.toFixed(3)}, {geo.lng.toFixed(3)}</span></div>
      <div className="row"><span className="k">ISP</span><span className="v">{geo.isp}</span></div>
      <div className="row">
        <span className="k">VPN / proxy</span>
        <span className={`v ${geo.vpnLikely ? 'flag' : ''}`}>{geo.vpnLikely ? 'likely detected' : 'not detected'}</span>
      </div>

      {geo.weather && (
        <>
          <div className="weather">
            <span className="temp">{geo.weather.tempC}&deg;C</span>
            <div>
              <div className="desc">{geo.weather.description}</div>
              <div className="note">wind {geo.weather.windKph} kph &middot; {geo.weather.isDay ? 'daytime' : 'night'} where you are</div>
            </div>
          </div>
        </>
      )}

      {geo.sun && (
        <div className="row">
          <span className="k">Your sun</span>
          <span className="v">rise {fmtTime(geo.sun.sunrise, geo.timezone)} &middot; set {fmtTime(geo.sun.sunset, geo.timezone)}</span>
        </div>
      )}

      {geo.countryMeta && (
        <>
          <div className="row"><span className="k">Population</span><span className="v">{geo.countryMeta.population.toLocaleString()}</span></div>
          <div className="row"><span className="k">Calling code</span><span className="v">{geo.countryMeta.callingCode || 'n/a'}</span></div>
          <div className="row"><span className="k">Languages</span><span className="v">{geo.countryMeta.languages.slice(0, 3).join(', ')}</span></div>
          {geo.forex && (
            <div className="row">
              <span className="k">Local currency</span>
              <span className="v">{geo.countryMeta.currencyCode} &middot; 1 = ${geo.forex.rateToUsd.toFixed(3)} USD</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
