import type { AiDossier, AuctionResult } from '../types';

export function DossierPanel({ dossier }: { dossier: AiDossier | null }) {
  if (!dossier) {
    return (
      <div className="panel">
        <p className="panel-title">AI dossier <span className="tag">nvidia-nim</span></p>
        <span className="loading">Inferring who you are</span>
        <p className="note">Sending your anonymous signals to the profiling model.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="panel-title">AI dossier <span className="tag">{dossier.source}</span></p>

      <div className="row"><span className="k">Likely occupation</span><span className="v">{dossier.occupation}</span></div>
      <div className="row"><span className="k">Age range</span><span className="v">{dossier.ageRange}</span></div>
      <div className="row"><span className="k">Income level</span><span className="v">{dossier.incomeLevel}</span></div>
      <div className="row"><span className="k">Tech savvy</span><span className="v">{dossier.techSavvy}</span></div>

      <p className="note" style={{ marginTop: 14 }}>Personality</p>
      <div className="chips">
        {dossier.personalityTraits?.map((t) => <span className="chip" key={t}>{t}</span>)}
      </div>

      <p className="note" style={{ marginTop: 14 }}>Inferred interests</p>
      <div className="chips">
        {dossier.inferredInterests?.map((t) => <span className="chip amber" key={t}>{t}</span>)}
      </div>

      <p className="note" style={{ marginTop: 16 }}>What it guessed about you</p>
      <ul className="insights">
        {dossier.creepyInsights?.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
    </div>
  );
}

export function AuctionPanel({ auction }: { auction: AuctionResult | null }) {
  if (!auction) {
    return (
      <div className="panel">
        <p className="panel-title">Ad auction <span className="tag">RTB</span></p>
        <span className="loading">Running the auction for you</span>
      </div>
    );
  }

  const winning = [...auction.bids].sort((a, b) => b.cpm - a.cpm);

  return (
    <div className="panel">
      <p className="panel-title">Ad auction <span className="tag">{auction.source}</span></p>
      <div className="bigstat">
        <span className="num">${auction.estimatedValue.toFixed(2)}</span>
        <span className="unit">est. CPM you are worth right now</span>
      </div>
      <p className="note" style={{ marginBottom: 10 }}>Simulated bids for one ad impression on you.</p>
      {winning.map((bid, i) => (
        <div className={`bid ${bid.status === 'no-bid' ? 'no' : ''}`} key={i}>
          <div>
            <div className="who">{bid.bidder}</div>
            <div className="why">{bid.reason}</div>
          </div>
          {bid.status === 'no-bid'
            ? <span className="status-no">no bid</span>
            : <span className="cpm">${bid.cpm.toFixed(2)}</span>}
        </div>
      ))}
    </div>
  );
}
