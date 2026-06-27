import type { BehaviorData } from '../types';

export function BehaviorPanel({ b }: { b: BehaviorData }) {
  return (
    <div className="panel">
      <p className="panel-title">Behavior <span className="tag">live</span></p>

      <div className="row"><span className="k">Mouse speed</span><span className="v">{b.mouseSpeed} px/s</span></div>
      <div className="row"><span className="k">Distance moved</span><span className="v">{b.mouseDistance.toLocaleString()} px</span></div>
      <div className="row"><span className="k">Clicks</span><span className="v">{b.clicks}{b.rageClicks ? ` (${b.rageClicks} rage)` : ''}</span></div>
      <div className="row"><span className="k">Scroll depth</span><span className="v">{b.scrollDepth}%</span></div>
      <div className="row"><span className="k">Direction changes</span><span className="v">{b.scrollChanges}</span></div>
      <div className="row"><span className="k">Keys pressed</span><span className="v">{b.keyPresses}{b.typingSpeed ? ` @ ${b.typingSpeed} cpm` : ''}</span></div>
      <div className="row"><span className="k">Tab switches</span><span className="v">{b.tabSwitches}</span></div>
      <div className="row"><span className="k">Focus time</span><span className="v">{Math.round(b.focusTimeMs / 1000)}s</span></div>

      <div style={{ marginTop: 14 }}>
        <div className="row" style={{ borderBottom: 'none' }}>
          <span className="k">Human score</span>
          <span className="v">{b.humanScore}/100</span>
        </div>
        <div className={`meter ${b.humanScore < 40 ? 'alert' : ''}`}>
          <i style={{ width: `${b.humanScore}%` }} />
        </div>
        <p className="note">Derived from how naturally you move, scroll, and type.</p>
      </div>
    </div>
  );
}
