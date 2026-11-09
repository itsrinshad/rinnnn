import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Avatar, StoriesBar, pubUrl, timeAgo } from './Social'
import { Logo } from './Symbiote'

const PAGE = 15

export function PostCard({ post, uid, isAdmin, liked, onDeleted }: { post: any; uid: string; isAdmin: boolean; liked: boolean; onDeleted: () => void }) {
  const [lk, setLk] = useState(liked); const [n, setN] = useState<number>(post.post_likes?.[0]?.count ?? 0)
  const [open, setOpen] = useState(false); const [cs, setCs] = useState<any[]>([]); const [txt, setTxt] = useState(''); const [cn, setCn] = useState<number>(post.post_comments?.[0]?.count ?? 0)
  const p = post.profiles
  const toggle = async () => {
    if (lk) { setLk(false); setN(n - 1); await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', uid) }
    else { setLk(true); setN(n + 1); await supabase.from('post_likes').insert({ post_id: post.id, user_id: uid }) }
  }
  const loadC = async () => { const r = await supabase.from('post_comments').select('*,profiles(username,display_name)').eq('post_id', post.id).order('created_at'); setCs(r.data ?? []) }
  const toggleC = () => { if (!open) loadC(); setOpen(!open) }
  const send = async () => {
    if (!txt.trim()) return
    const { error } = await supabase.from('post_comments').insert({ post_id: post.id, user_id: uid, body: txt.trim() })
    if (!error) { setTxt(''); setCn(cn + 1); loadC() }
  }
  const del = async () => { if (confirm('Delete this post?')) { await supabase.from('posts').delete().eq('id', post.id); onDeleted() } }
  return (
    <article className="glass post">
      <div className="flex items-center gap-2 p-3">
        <Link to={`/u/${p?.username}`}><Avatar url={p?.avatar_url} name={p?.display_name || p?.username} size={36} /></Link>
        <Link to={`/u/${p?.username}`} className="font-semibold text-sm">{p?.display_name || p?.username}</Link>
        <span className="text-xs text-gray-500">{timeAgo(post.created_at)}</span>
        {(post.author_id === uid || isAdmin) && <button className="ml-auto text-gray-400" onClick={del}>🗑</button>}
      </div>
      {post.kind === 'image' && <img src={pubUrl(post.media_path)} className="post-media" loading="lazy" />}
      {post.kind === 'video' && <video src={pubUrl(post.media_path)} className="post-media" controls playsInline preload="metadata" />}
      {post.kind === 'text' && <div className="post-text">{post.caption}</div>}
      {post.music_path && <div className="post-music"><span>🎵 {post.music_title || 'Music'}</span><audio src={pubUrl(post.music_path)} controls preload="none" /></div>}
      <div className="flex gap-4 px-3 pt-2 text-xl">
        <button onClick={toggle} className={lk ? 'like on' : 'like'}>{lk ? '❤️' : '🤍'}</button>
        <button onClick={toggleC}>💬</button>
      </div>
      <div className="px-3 pb-1 text-sm font-semibold">{n} {n === 1 ? 'like' : 'likes'}</div>
      {post.kind !== 'text' && post.caption && <div className="px-3 pb-2 text-sm"><b>{p?.display_name || p?.username}</b> {post.caption}</div>}
      <button className="px-3 pb-2 text-xs text-gray-400" onClick={toggleC}>{open ? 'Hide comments' : cn ? `View ${cn} comment${cn > 1 ? 's' : ''}` : 'Add a comment'}</button>
      {open && <div className="px-3 pb-3">
        {cs.map(c => <div key={c.id} className="text-sm mb-1"><b>{c.profiles?.display_name || c.profiles?.username}</b> {c.body}</div>)}
        <div className="flex gap-2 mt-2"><input className="sym-inp !mb-0" placeholder="Add a comment…" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} /><button className="sym-btn" onClick={send}>Post</button></div>
      </div>}
    </article>
  )
}

export function Home() {
  const { session, profile, isAdmin } = useAuth(); const uid = session?.user.id
  const [posts, setPosts] = useState<any[]>([]); const [likes, setLikes] = useState<Set<string>>(new Set()); const [more, setMore] = useState(true); const [busy, setBusy] = useState(false); const [stat, setStat] = useState<any>(null)
  const load = async (from: number) => {
    if (!uid) return
    setBusy(true)
    const r = await supabase.from('posts').select('*,profiles(username,display_name,avatar_url),post_likes(count),post_comments(count)').order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    const rows = r.data ?? []
    const ids = rows.map((x: any) => x.id)
    if (ids.length) { const l = await supabase.from('post_likes').select('post_id').eq('user_id', uid).in('post_id', ids); setLikes(s => new Set([...s, ...(l.data ?? []).map((x: any) => x.post_id)])) }
    setPosts(from === 0 ? rows : p => [...p, ...rows]); setMore(rows.length === PAGE); setBusy(false)
  }
  useEffect(() => { load(0); supabase.from('guild_stats').select('*').single().then(r => setStat(r.data)) }, [uid])
  if (!session) return (
    <div className="glass p-6 text-center space-y-3 mt-6">
      <Logo size={30} /><p className="text-gray-300 text-sm">Official SYMBIOTES guild app. Accounts are created by the admin.</p>
      <div className="flex gap-2 justify-center"><Link to="/login" className="sym-btn">Member login</Link><Link to="/admin-login" className="sym-btn">Admin</Link></div>
      <Link to="/leaderboard" className="block text-cyan-300 text-sm">View leaderboard →</Link>
    </div>
  )
  return (
    <div className="space-y-3">
      <StoriesBar uid={uid!} me={profile as any} />
      <div className="chips">
        <Link to="/leaderboard">🏆 Rank</Link><Link to="/announcements">📢 News</Link><Link to="/polls">🗳 Polls</Link><Link to="/members">👥 Members</Link>{isAdmin && <Link to="/admin/glory">⚡ Glory</Link>}
      </div>
      {stat && <div className="grid grid-cols-2 gap-2"><div className="glass p-3 text-center text-xs text-gray-400">Members<br /><b className="text-xl text-white">{stat.members}</b></div><div className="glass p-3 text-center text-xs text-gray-400">Total glory<br /><b className="text-xl text-white">{stat.total_glory}</b></div></div>}
      {posts.map(p => <PostCard key={p.id} post={p} uid={uid!} isAdmin={isAdmin} liked={likes.has(p.id)} onDeleted={() => setPosts(x => x.filter(y => y.id !== p.id))} />)}
      {!posts.length && !busy && <div className="glass p-6 text-center text-gray-400 text-sm">No posts yet. Tap ➕ to share the first one!</div>}
      {more && posts.length > 0 && <button className="sym-btn w-full" disabled={busy} onClick={() => load(posts.length)}>{busy ? 'Loading…' : 'Load more'}</button>}
    </div>
  )
}
