import { useEffect, useRef, useState } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import { joinPresence, realtimeEnabled } from '../lib/supabase';
import type { VisitorPoint } from '../types';

export function GlobePanel({ self }: { self: VisitorPoint | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const [count, setCount] = useState(1);

  // Build the globe once
  useEffect(() => {
    const host = hostRef.current;
    if (!host || globeRef.current) return;

    const g = new Globe(host)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
      .atmosphereColor('#ffb000')
      .atmosphereAltitude(0.16)
      .pointColor(() => '#ffb000')
      .pointAltitude(0.04)
      .pointRadius(0.4)
      .pointLabel((d: object) => {
        const p = d as VisitorPoint;
        return `${p.city}, ${p.country}`;
      });

    const resize = () => {
      g.width(host.clientWidth).height(Math.max(360, host.clientWidth * 0.8));
    };
    resize();
    window.addEventListener('resize', resize);

    const controls = g.controls() as { autoRotate: boolean; autoRotateSpeed: number };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    globeRef.current = g;
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Join presence and feed points to the globe
  useEffect(() => {
    if (!self) return;
    const cleanup = joinPresence(self, (points: VisitorPoint[]) => {
      setCount(points.length);
      const g = globeRef.current;
      if (g) {
        g.pointsData(points);
        // ease the camera to the local visitor on first load
        g.pointOfView({ lat: self.lat, lng: self.lng, altitude: 2.2 }, 1200);
      }
    });
    return cleanup;
  }, [self]);

  return (
    <div className="panel">
      <p className="panel-title">
        Live visitors
        <span className="tag">{realtimeEnabled ? 'realtime' : 'solo mode'}</span>
      </p>
      <div className="bigstat">
        <span className="num">{count}</span>
        <span className="unit">online now{realtimeEnabled ? '' : ' (you)'}</span>
      </div>
      <div className="globe-wrap">
        <div ref={hostRef} className="globe-host" />
      </div>
      {!realtimeEnabled && (
        <p className="note">Add Supabase env vars to see other live visitors on the globe.</p>
      )}
    </div>
  );
}

export default GlobePanel;
