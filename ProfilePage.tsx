import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Avatar, BADGE_ICON, Group, StoryViewer, loadStories, pubUrl } from './Social'
import { PostCard } from './Feed'

export function Profile() {
  const { username } = useParams(); const { session, isAdmin } = useAuth(); const me = session!.user.id; const nav = useNavigate()
  const [p, setP] = useState<any>(null); const [badges, setBadges] = useState<any[]>([]); const [posts, setPosts] = useState<any[]>([]); const [stat, setStat] = useState<any>(null)
  const [edit, setEdit] = useState(false); const [msg, setMsg] = useState(''); const [open, setOpen] = useState<any>(null)
  const [grp, setGrp] = useState<Group[]>([]); const [seen, setSeen] = useState<Set<string>>(new Set()); const [view, setView] = useState(false)
  const [allBadges, setAllBadges] = useState<any[]>([]); const [giveId, setGiveId] = useState('')
  const load = async () => {
    const q = supabase.from('profiles').select('*'); const r = await (username ? q.eq('username', username.toLowerCase()) : q.eq('id', me)).maybeSingle()
    setP(r.data); if (!r.data) return
    const id = r.data.id
    supabase.from('member_badges').select('badges(name,code)').eq('member_id', id).then(x => setBadges(x.data ?? []))
    supabase.from('posts').select('*,profiles(username,display_name,avatar_url),post_likes(count),post_comments(count)').eq('author_id', id).order('created_at', { ascending: false }).then(x => setPosts(x.data ?? []))
    supabase.from('lb_lifetime').select('glory,rnk').eq('member_id', id).maybeSingle().then(x => setStat(x.data))
    loadStories(me).then(x => { setGrp(x.groups.filter(g => g.author_id === id)); setSeen(x.seen) })
  }
  useEffect(() => { setEdit(false); setMsg(''); load() }, [username])
  useEffect(() => { if (isAdmin) supabase.from('badges').select('id,name').then(r => setAllBadges(r.data ?? [])) }, [isAdmin])
  if (!p) return <p className="text-center text-gray-400 mt-10">Loading…</p>
  const mine = p.id === me
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }))
  const save = async () => {
    const { error } = await supabase.from('profiles').update({ display_name: p.display_name, bio: p.bio, ff_ign: p.ff_ign, ff_uid: p.ff_uid, player_level: p.player_level ? Number(p.player_level) : null, ff_rank: p.ff_rank }).eq('id', me)
    setMsg(error ? error.message : 'Saved ✅'); if (!error) setEdit(false)
  }
  const upload = async (file?: File) => {
    if (!file) return; setMsg('Uploading photo…')
    const path = `${me}/avatar-${Date.now()}`
    const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type }); if (up.error) return setMsg(up.error.message)
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', me); set('avatar_url', url); setMsg('Photo updated ✅')
  }
  const dm = async () => { const { data, error } = await supabase.rpc('get_or_create_dm', { other: p.id }); if (error) return setMsg(error.message); nav('/chat?c=' + data) }
  const give = async () => { if (!giveId) return; const { error } = await supabase.from('member_badges').insert({ member_id: p.id, badge_id: Number(giveId), awarded_by: me }); setMsg(error ? error.message : 'Badge given ✅'); load() }
  const ring = grp.length ? (grp[0].stories.some(s => !seen.has(s.id)) ? 'new' : 'seen') : 'none'
  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="flex items-center gap-4">
          <Avatar url={p.avatar_url} name={p.display_name || p.username} size={84} ring={mine && !grp.length ? 'none' : (ring as any)} onClick={grp.length ? () => setView(true) : undefined} />
          <div className="flex-1 grid grid-cols-3 text-center">
            <div><b className="text-lg">{posts.length}</b><div className="text-xs text-gray-400">Posts</div></div>
            <div><b className="text-lg">{stat?.glory ?? 0}</b><div className="text-xs text-gray-400">Glory</div></div>
            <div><b className="text-lg">{stat?.rnk ? '#' + stat.rnk : '—'}</b><div className="text-xs text-gray-400">Rank</div></div>
          </div>
        </div>
        <div className="mt-3"><b>{p.display_name || p.username}</b> <span className="text-xs text-gray-500">@{p.username} · {p.role}</span></div>
        {p.bio && <p className="text-sm whitespace-pre-wrap mt-1">{p.bio}</p>}
        <p className="text-xs text-gray-400 mt-1">{p.ff_ign ? `🎮 ${p.ff_ign}` : ''} {p.ff_uid && p.ff_uid !== '0' ? `· ID ${p.ff_uid}` : ''} {p.player_level ? `· Lv ${p.player_level}` : ''} {p.ff_rank ? `· ${p.ff_rank}` : ''}</p>
        <div className="flex gap-2 mt-3">
          {mine ? <><button className="sym-btn flex-1" onClick={() => setEdit(!edit)}>{edit ? 'Close' : 'Edit profile'}</button><Link to="/create?m=story" className="sym-btn text-center">+ Story</Link></> : <button className="sym-btn flex-1" onClick={dm}>💬 Message</button>}
        </div>
        {msg && <p className="text-amber-300 text-sm mt-2">{msg}</p>}
      </div>

      {badges.length > 0 && <div className="badge-row">{badges.map((b, i) => <div key={i} className="badge-item"><span className="badge-c">{BADGE_ICON[b.badges?.code] ?? '🏅'}</span><small>{b.badges?.name}</small></div>)}</div>}
      {isAdmin && !mine && <div className="glass p-3 flex gap-2"><select className="sym-inp !mb-0" value={giveId} onChange={e => setGiveId(e.target.value)}><option value="">Give a badge…</option>{allBadges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="sym-btn" onClick={give}>Give</button></div>}

      {mine && edit && <div className="glass p-4 space-y-1">
        <label className="upload-box !p-3 text-sm">📷 Change profile photo<input type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} /></label>
        <input className="sym-inp" placeholder="Display name" value={p.display_name ?? ''} onChange={e => set('display_name', e.target.value)} />
        <textarea className="sym-inp" rows={3} placeholder="Bio" value={p.bio ?? ''} onChange={e => set('bio', e.target.value)} />
        <input className="sym-inp" placeholder="In-game name" value={p.ff_ign ?? ''} onChange={e => set('ff_ign', e.target.value)} />
        <input className="sym-inp" placeholder="Game ID (UID)" value={p.ff_uid ?? ''} onChange={e => set('ff_uid', e.target.value)} />
        <input className="sym-inp" inputMode="numeric" placeholder="Level" value={p.player_level ?? ''} onChange={e => set('player_level', e.target.value)} />
        <input className="sym-inp" placeholder="Rank (e.g. Heroic)" value={p.ff_rank ?? ''} onChange={e => set('ff_rank', e.target.value)} />
        <button className="sym-btn w-full" onClick={save}>Save profile</button>
        <button className="sym-btn danger w-full mt-2" onClick={() => supabase.auth.signOut().then(() => nav('/login'))}>Logout</button>
      </div>}

      <div className="post-grid">
        {posts.map(x => (
          <button key={x.id} onClick={() => setOpen(x)} className="grid-cell">
            {x.kind === 'image' && <img src={pubUrl(x.media_path)} loading="lazy" />}
            {x.kind === 'video' && <><video src={pubUrl(x.media_path) + '#t=0.1'} preload="metadata" muted playsInline /><span className="grid-tag">▶</span></>}
            {x.kind === 'text' && <div className="grid-text">{x.caption}</div>}
            {x.music_path && <span className="grid-tag r">🎵</span>}
          </button>
        ))}
      </div>
      {!posts.length && <p className="text-center text-gray-500 text-sm">No posts yet.</p>}

      {open && <div className="modal" onClick={() => setOpen(null)}><div className="modal-in" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={() => setOpen(null)}>✕</button>
        <PostCard post={open} uid={me} isAdmin={isAdmin} liked={false} onDeleted={() => { setOpen(null); load() }} />
      </div></div>}
      {view && <StoryViewer groups={grp} start={0} uid={me} onClose={() => setView(false)} onChanged={load} />}
    </div>
  )
}

export function Members() {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState('')
  useEffect(() => { supabase.from('profiles').select('id,username,display_name,avatar_url,role,ff_ign').eq('status', 'active').order('username').then(r => setRows(r.data ?? [])) }, [])
  const list = rows.filter(r => (r.username + (r.display_name ?? '') + (r.ff_ign ?? '')).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-3">
      <input className="sym-inp" placeholder="🔍 Search members" value={q} onChange={e => setQ(e.target.value)} />
      {list.map(r => <Link key={r.id} to={`/u/${r.username}`} className="glass p-3 flex items-center gap-3"><Avatar url={r.avatar_url} name={r.display_name || r.username} size={44} /><div><b>{r.display_name || r.username}</b><div className="text-xs text-gray-400">@{r.username} · {r.role}</div></div></Link>)}
    </div>
  )
}
