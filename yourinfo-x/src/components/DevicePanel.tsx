import type { ClientInfo } from '../types';
import { Redact } from './Reveal';

export function DevicePanel({ info }: { info: ClientInfo }) {
  return (
    <div className="panel">
      <p className="panel-title">Device <span className="tag">hardware</span></p>
      <div className="row"><span className="k">Screen</span><span className="v">{info.screenWidth} x {info.screenHeight} @ {info.pixelRatio}x</span></div>
      <div className="row"><span className="k">CPU cores</span><span className="v">{info.cpuCores || 'hidden'}</span></div>
      <div className="row"><span className="k">Memory</span><span className="v">{info.deviceMemory ? `${info.deviceMemory} GB${info.deviceMemory === 8 ? ' (capped)' : ''}` : 'hidden'}</span></div>
      <div className="row"><span className="k">GPU</span><span className="v"><Redact>{info.gpuRenderer || 'masked'}</Redact></span></div>
      <div className="row"><span className="k">Touch points</span><span className="v">{info.maxTouchPoints}</span></div>
      <div className="row"><span className="k">Battery</span><span className="v">{info.batteryLevel != null ? `${info.batteryLevel}% ${info.batteryCharging ? 'charging' : ''}` : 'hidden'}</span></div>
      <div className="row"><span className="k">Connection</span><span className="v">{info.connectionType || 'unknown'}{info.downlink ? ` ~${info.downlink} Mbps` : ''}</span></div>
      <div className="row"><span className="k">Color gamut</span><span className="v">{info.colorGamut.toUpperCase()}</span></div>
    </div>
  );
}

export function BrowserPanel({ info }: { info: ClientInfo }) {
  return (
    <div className="panel">
      <p className="panel-title">Browser <span className="tag">software</span></p>
      <div className="row"><span className="k">Browser</span><span className="v">{info.browserName} {info.browserVersion}</span></div>
      <div className="row"><span className="k">Platform</span><span className="v">{info.platform}</span></div>
      <div className="row"><span className="k">Language</span><span className="v">{info.languages.join(', ')}</span></div>
      <div className="row"><span className="k">Timezone</span><span className="v">{info.timezone} (UTC{info.timezoneOffset <= 0 ? '+' : '-'}{Math.abs(info.timezoneOffset / 60)})</span></div>
      <div className="row"><span className="k">Fonts found</span><span className="v">{info.fonts.length} detected</span></div>
      <div className="row"><span className="k">Canvas hash</span><span className="v"><Redact>{info.canvasHash}</Redact></span></div>
      <div className="row"><span className="k">WebGL hash</span><span className="v"><Redact>{info.webglHash}</Redact></span></div>
      <div className="row"><span className="k">Audio hash</span><span className="v"><Redact>{info.audioHash}</Redact></span></div>
    </div>
  );
}

export function PrivacyPanel({ info }: { info: ClientInfo }) {
  const flags: Array<{ k: string; v: string; alert: boolean }> = [
    { k: 'Do Not Track', v: info.doNotTrack ? 'on' : 'off', alert: false },
    { k: 'Global Privacy Control', v: info.globalPrivacyControl ? 'on' : 'off', alert: false },
    { k: 'Incognito', v: info.incognitoLikely == null ? 'unknown' : info.incognitoLikely ? 'likely' : 'no', alert: false },
    { k: 'Ad blocker', v: info.adBlockerLikely ? 'detected' : 'none', alert: info.adBlockerLikely },
    { k: 'WebRTC leak', v: info.webrtcLocalIPs.length ? `${info.webrtcLocalIPs.length} local IP(s)` : 'none', alert: info.webrtcLocalIPs.length > 0 },
    { k: 'Cookies', v: info.cookiesEnabled ? 'enabled' : 'blocked', alert: false },
  ];
  return (
    <div className="panel">
      <p className="panel-title">Privacy signals <span className="tag">leaks</span></p>
      {flags.map((f) => (
        <div className="row" key={f.k}>
          <span className="k">{f.k}</span>
          <span className={`v ${f.alert ? 'flag' : ''}`}>{f.v}</span>
        </div>
      ))}
      {info.webrtcLocalIPs.length > 0 && (
        <p className="note">Local IPs exposed via WebRTC: {info.webrtcLocalIPs.join(', ')}</p>
      )}
    </div>
  );
}
