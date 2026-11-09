import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'

export const BUCKET = 'social'
export const pubUrl = (p?: string | null) => (p ? supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl : '')
export async function uploadMedia(file: File, uid: string) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (error) throw error
  return path
}
export const timeAgo = (d: string) => {
  const s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}
export const BG = ['linear-gradient(135deg,#7c3aed,#06b6d4)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#10b981,#3b82f6)', 'linear-gradient(135deg,#ec4899,#8b5cf6)']
export const BADGE_ICON: Record<string, string> = { glory_champion: '🏆', weekly_mvp: '⭐', most_active: '🔥', tournament_winner: '🥇', guild_veteran: '🛡️', top_contributor: '💎', founding_member: '👑' }

export function Avatar({ url, name, size = 44, ring = 'none', onClick }: { url?: string | null; name?: string | null; size?: number; ring?: 'new' | 'seen' | 'none'; onClick?: () => void }) {
  const st = { width: size, height: size }
  return (
    <span className={'ring ' + (ring === 'new' ? '' : ring)} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <span className="ring-in">
        {url ? <img src={url} style={st} className="ava" /> : <span style={{ ...st, fontSize: size / 2.3 }} className="ava ph">{(name || '?')[0].toUpperCase()}</span>}
      </span>
    </span>
  )
}

export type Story = { id: string; author_id: string; kind: string; media_path: string | null; caption: string | null; bg: string | null; music_path: string | null; music_title: string | null; created_at: string }
export type Group = { author_id: string; username: string; name: string; avatar: string | null; stories: Story[] }

export async function loadStories(uid: string) {
  const { data } = await supabase.from('stories').select('*,profiles(username,display_name,avatar_url)').gt('expires_at', new Date().toISOString()).order('created_at')
  const v = await supabase.from('story_views').select('story_id').eq('user_id', uid)
  const seen = new Set<string>((v.data ?? []).map((x: any) => x.story_id))
  const map = new Map<string, Group>()
  for (const s of (data ?? []) as any[]) {
    if (!map.has(s.author_id)) map.set(s.author_id, { author_id: s.author_id, username: s.profiles?.username ?? '?', name: s.profiles?.display_name || s.profiles?.username || '?', avatar: s.profiles?.avatar_url ?? null, stories: [] })
    map.get(s.author_id)!.stories.push(s)
  }
  const unseen = (g: Group) => g.stories.some(s => !seen.has(s.id))
  const groups = [...map.values()].sort((a, b) => (a.author_id === uid ? -1 : b.author_id === uid ? 1 : Number(unseen(b)) - Number(unseen(a))))
  return { groups, seen }
}

export function StoryViewer({ groups, start, uid, onClose, onChanged }: { groups: Group[]; start: number; uid: string; onClose: () => void; onChanged: () => void }) {
  const [gi, setGi] = useState(start); const [si, setSi] = useState(0)
  const g = groups[gi]; const s = g?.stories[si]
  const dur = 5500
  const next = () => { if (si < g.stories.length - 1) setSi(si + 1); else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0) } else { onChanged(); onClose() } }
  const prev = () => { if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0) } }
  useEffect(() => {
    if (!s) return
    if (s.author_id !== uid) supabase.from('story_views').insert({ story_id: s.id, user_id: uid }).then(() => {})
    if (s.kind === 'video') return
    const t = setTimeout(next, dur); return () => clearTimeout(t)
  }, [gi, si])
  const del = async () => { if (!confirm('Delete this story?')) return; await supabase.from('stories').delete().eq('id', s.id); onChanged(); onClose() }
  if (!s) return null
  return (
    <div className="story-view">
      <div className="story-bars">{g.stories.map((x, i) => <b key={x.id}><i key={gi + '-' + si} style={i < si ? { width: '100%' } : i === si && s.kind !== 'video' ? { animation: `fill ${dur}ms linear forwards` } : i === si ? { width: '100%', opacity: .6 } : {}} /></b>)}</div>
      <div className="story-head">
        <Avatar url={g.avatar} name={g.name} size={34} /><b className="ml-2">{g.name}</b><span className="ml-2 text-xs text-gray-300">{s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <span className="ml-auto" />{s.author_id === uid && <button onClick={del} className="px-2">🗑</button>}<button onClick={onClose} className="px-2 text-xl">✕</button>
      </div>
      <div className="story-body">
        {s.kind === 'image' && <img src={pubUrl(s.media_path)} />}
        {s.kind === 'video' && <video src={pubUrl(s.media_path)} autoPlay playsInline controls={false} onEnded={next} />}
        {s.kind === 'text' && <div className="story-card" style={{ background: BG[Number(s.bg) || 0] }}>{(s.caption || '').split('\n').map((l, i) => <div key={i} className={i === 0 ? 'text-lg opacity-90' : 'text-5xl font-black'}>{l}</div>)}</div>}
        {s.kind !== 'text' && s.caption && <div className="story-cap">{s.caption}</div>}
        {s.music_path && <><audio src={pubUrl(s.music_path)} autoPlay loop /><div className="story-music">🎵 {s.music_title || 'Music'}</div></>}
      </div>
      <div className="story-tap l" onClick={prev} /><div className="story-tap r" onClick={next} />
    </div>
  )
}

export function StoriesBar({ uid, me }: { uid: string; me?: { avatar_url?: string | null; display_name?: string | null; username?: string } | null }) {
  const [groups, setGroups] = useState<Group[]>([]); const [seen, setSeen] = useState<Set<string>>(new Set()); const [open, setOpen] = useState<number | null>(null)
  const load = () => loadStories(uid).then(r => { setGroups(r.groups); setSeen(r.seen) })
  useEffect(() => { load() }, [])
  const mine = groups.findIndex(g => g.author_id === uid)
  const ringOf = (g: Group): 'new' | 'seen' => (g.stories.some(x => !seen.has(x.id)) ? 'new' : 'seen')
  return (
    <div className="stories-row">
      <div className="story-item">
        <div className="relative">
          <Avatar url={me?.avatar_url} name={me?.display_name || me?.username} size={58} ring={mine >= 0 ? 'new' : 'none'} onClick={mine >= 0 ? () => setOpen(mine) : undefined} />
          <Link to="/create?m=story" className="story-plus">+</Link>
        </div>
        <span>Your story</span>
      </div>
      {groups.map((g, i) => g.author_id === uid ? null : (
        <div key={g.author_id} className="story-item" onClick={() => setOpen(i)}>
          <Avatar url={g.avatar} name={g.name} size={58} ring={ringOf(g)} /><span>{g.name}</span>
        </div>
      ))}
      {open !== null && <StoryViewer groups={groups} start={open} uid={uid} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
