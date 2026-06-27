// Supabase Realtime powers two things on the free tier:
//   1. A presence channel so every connected visitor appears live on the globe
//   2. A broadcast based count of who is currently online
//
// If the Supabase env vars are not set, the app degrades gracefully: the globe
// still shows the local visitor, just without other people.

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { VisitorPoint } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const realtimeEnabled = Boolean(url && anon);

const supabase = realtimeEnabled ? createClient(url!, anon!) : null;

export function joinPresence(
  self: VisitorPoint,
  onVisitors: (points: VisitorPoint[]) => void,
): () => void {
  if (!supabase) {
    // Solo mode: just show yourself
    onVisitors([self]);
    return () => {};
  }

  const channel: RealtimeChannel = supabase.channel('globe-presence', {
    config: { presence: { key: self.id } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<VisitorPoint>();
      const points: VisitorPoint[] = [];
      for (const key of Object.keys(state)) {
        const entry = state[key][0];
        if (entry) points.push(entry);
      }
      onVisitors(points.length ? points : [self]);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(self);
      }
    });

  return () => {
    channel.untrack();
    supabase.removeChannel(channel);
  };
}
