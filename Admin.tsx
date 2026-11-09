import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Avatar, BadgeBubble } from './ui'

type P = { id: string; username: string; display_name: string | null; avatar_url: string | null; ff_ign: string | null; ff_uid: string | null; role: string; status: string }

export function AdminPanel() {
  const { session, profile } = useAuth(); const isSuper = profile?.role === 'super_admin'
  const [rows, setRows] = useState<P[]>([]); const [q, setQ] = useState(''); const [msg, setMsg] = useState(''); const [open, setOpen] = useState<string | null>(null)
  const [pw, setPw] = useState<Record<string, string>>({}); const [badges, setBadges] = useState<any[]>([]); const [mb, setMb] = useState<any[]>([]); const [pickB, setPickB] = useState<Record<string, string>>({})
  const [nu, setNu] = useState({ username: '', password: '', ff_uid: '', ff_ign: '' }); const [made, setMade] = useState('')
  const load = async () => {
    const r = await supabase.from('profiles').select('id,username,display_name,avatar_url,ff_ign,ff_uid,role,status').order('joined_at', { ascending: false })
    setRows((r.data ?? []) as P[])
    const b = await supabase.from('badges').select('id,code,name').order('id'); setBadges(b.data ?? [])
    const m = await supabase.from('member_badges').select('member_id,badge_id'); setMb(m.data ?? [])
  }
  useEffect(() => { load() }, [])
  const rpc = async (fn: string, args: object, ok: string) => {
    const { error } = await supabase.rpc(fn, args); setMsg(error ? '❌ ' + error.message : '✅ ' + ok); load(); return !error
  }
  const create = async () => {
    setMade('')
    const ok = await rpc('admin_create_user', { p_username: nu.username, p_password: nu.password, p_ff_uid: nu.ff_uid, p_ff_ign: nu.ff_ign }, 'Account created')
    if (ok) { setMade(`Username: ${nu.username.trim().toLowerCase()}\nPassword: ${nu.password}`); setNu({ username: '', password: '', ff_uid: '', ff_ign: '' }) }
  }
  const remove = (p: P) => { if (confirm(`Remove ${p.username}? This deletes the account permanently.`)) rpc('admin_delete_user', { p_user: p.id }, `${p.username} removed`) }
  const setPass = async (p: P) => {
    const v = pw[p.id] ?? ''; if (v.length < 6) return setMsg('❌ New password must be at least 6 characters.')
    if (await rpc('admin_set_password', { p_user: p.id, p_password: v }, `Password changed for ${p.username}`)) setPw({ ...pw, [p.id]: '' })
  }
  const moderate = (p: P, action: string) => rpc('moderate_user', { p_target: p.id, p_action: action, p_reason: 'by admin' }, `${p.username}: ${action}`)
  const setRole = async (p: P, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id); setMsg(error ? '❌ ' + error.message : `✅ ${p.username} is now ${role}`); load()
  }
  const giveBadge = async (p: P) => {
    const bid = Number(pickB[p.id]); if (!bid) return
    const { error } = await supabase.from('member_badges').insert({ member_id: p.id, badge_id: bid, awarded_by: session!.user.id })
    setMsg(error ? '❌ ' + error.message : '✅ Badge given'); load()
  }
  const takeBadge = async (p: P, bid: number) => {
    const { error } = await supabase.from('member_badges').delete().eq('member_id', p.id).eq('badge_id', bid)
    setMsg(error ? '❌ ' + error.message : '✅ Badge removed'); load()
  }
  const members = rows.filter(r => (r.username + (r.display_name ?? '') + (r.ff_ign ?? '') + (r.ff_uid ?? '')).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Admin</h2>
      <Link to="/admin/glory" className="sym-btn block text-center">⚡ Daily glory entry</Link>
      {msg && <p className="glass p-3 text-sm">{msg}</p>}

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">➕ Create member</h3>
        <input className="sym-inp" placeholder="Username (letters/numbers/_)" value={nu.username} onChange={e => setNu({ ...nu, username: e.target.value })} autoCapitalize="none" autoCorrect="off" />
        <input className="sym-inp" placeholder="Password (min 6)" value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} autoCapitalize="none" />
        <input className="sym-inp" placeholder="Game ID (UID)" inputMode="numeric" value={nu.ff_uid} onChange={e => setNu({ ...nu, ff_uid: e.target.value })} />
        <input className="sym-inp" placeholder="In-game name (optional)" value={nu.ff_ign} onChange={e => setNu({ ...nu, ff_ign: e.target.value })} />
        <button className="sym-btn ok w-full" onClick={create}>Create account</button>
        {made && <pre className="mt-2 text-sm text-green-300 whitespace-pre-wrap">Give this to the member:{'\n'}{made}</pre>}
      </div>

      <div className="glass p-4">
        <h3 className="font-semibold mb-2">Members ({members.length})</h3>
        <input className="sym-inp" placeholder="Search name / username / game ID" value={q} onChange={e => setQ(e.target.value)} />
        {members.map(p => {
          const mine = mb.filter(x => x.member_id === p.id)
          return (
            <div key={p.id} className="border-t border-white/10 py-3">
              <div className="flex items-center gap-3" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <Avatar src={p.avatar_url} name={p.display_name ?? p.username} size={44} />
                <div className="flex-1 min-w-0"><div className="font-medium truncate">{p.display_name ?? p.username}</div>
                  <div className="text-xs text-gray-400 truncate">@{p.username} · {p.role.replace('_', ' ')} · {p.status} · ID {p.ff_uid ?? '—'}</div></div>
                <span className="text-gray-500">{open === p.id ? '▲' : '▼'}</span>
              </div>
              {open === p.id && <div className="mt-3 space-y-3">
                <div className="flex gap-2"><input className="sym-inp !mb-0" placeholder="New password" value={pw[p.id] ?? ''} onChange={e => setPw({ ...pw, [p.id]: e.target.value })} autoCapitalize="none" /><button className="sym-btn" onClick={() => setPass(p)}>Set</button></div>
                <div>
                  <div className="badges">{mine.map(x => { const b = badges.find(y => y.id === x.badge_id); return b ? <BadgeBubble key={x.badge_id} code={b.code} name={b.name} onRemove={() => takeBadge(p, x.badge_id)} /> : null })}</div>
                  <div className="flex gap-2 mt-2"><select className="sym-inp !mb-0" value={pickB[p.id] ?? ''} onChange={e => setPickB({ ...pickB, [p.id]: e.target.value })}><option value="">Give a badge…</option>{badges.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="sym-btn" onClick={() => giveBadge(p)}>Give</button></div>
                  {mine.length > 0 && <p className="text-xs text-gray-500 mt-1">Tap a badge to remove it.</p>}
                </div>
                {p.id !== session?.user.id && <div className="flex gap-2 flex-wrap">
                  {p.status === 'active' ? <><button className="sym-btn" onClick={() => moderate(p, 'suspend')}>Suspend</button><button className="sym-btn danger" onClick={() => moderate(p, 'ban')}>Ban</button></> : <button className="sym-btn ok" onClick={() => moderate(p, 'unban')}>Unban / Activate</button>}
                  {isSuper && p.role !== 'super_admin' && <button className="sym-btn" onClick={() => setRole(p, p.role === 'admin' ? 'member' : 'admin')}>{p.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}
                  <button className="sym-btn danger" onClick={() => remove(p)}>Delete account</button>
                </div>}
              </div>}
            </div>)
        })}
      </div>
    </div>
  )
}
