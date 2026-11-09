import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { Avatar } from './Social'

type Msg = { id: string; sender_id: string; body: string | null; kind: string; media_path: string | null; created_at: string }
type Conv = { id: string; type: string; name: string | null; other?: string }
const BUCKET = 'chat-media'

export function Chat() {
  const { session, isAdmin } = useAuth(); const uid = session!.user.id; const [q, setQ] = useSearchParams()
  const [convs, setConvs] = useState<Conv[]>([]); const [cur, setCurS] = useState<string | null>(q.get('c'))
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('')
  const [people, setPeople] = useState<any[]>([]); const [names, setNames] = useState<Record<string, any>>({})
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [panel, setPanel] = useState<'none' | 'new' | 'group' | 'members'>('none'); const [gname, setGname] = useState(''); const [picked, setPicked] = useState<string[]>([])
  const [members, setMembers] = useState<any[]>([]); const [addId, setAddId] = useState('')
  const [rec, setRec] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const recRef = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const endRef = useRef<HTMLDivElement>(null)
  const setCur = (id: string | null) => { setCurS(id); setQ(id ? { c: id } : {}, { replace: true }); setPanel('none') }
  const curConv = convs.find(c => c.id === cur)
  const title = (c?: Conv) => (c ? (c.type === 'group' ? c.name ?? 'Group' : names[c.other ?? '']?.name ?? 'Chat') : '')

  const loadConvs = async () => {
    const { data } = await supabase.from('conversation_members').select('conversations(id,type,name)').eq('user_id', uid)
    const list: Conv[] = (data ?? []).map((r: any) => r.conversations).filter(Boolean)
    const dmIds = list.filter(c => c.type === 'dm').map(c => c.id)
    if (dmIds.length) {
      const o = await supabase.from('conversation_members').select('conversation_id,user_id').in('conversation_id', dmIds).neq('user_id', uid)
      const m = new Map((o.data ?? []).map((x: any) => [x.conversation_id, x.user_id]))
      list.forEach(c => { if (c.type === 'dm') c.other = m.get(c.id) as string })
    }
    setConvs(list)
  }
  useEffect(() => {
    loadConvs()
    supabase.from('profiles').select('id,username,display_name,avatar_url').eq('status', 'active').then(r => {
      const all = r.data ?? []; setPeople(all.filter((p: any) => p.id !== uid))
      setNames(Object.fromEntries(all.map((p: any) => [p.id, { name: p.display_name || p.username, avatar: p.avatar_url }])))
    })
  }, [])

  const sign = async (list: Msg[]) => {
    const paths = list.map(m => m.media_path).filter((p): p is string => !!p)
    if (!paths.length) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 86400)
    if (data) setUrls(u => ({ ...u, ...Object.fromEntries(data.filter(d => d.path && d.signedUrl).map(d => [d.path as string, d.signedUrl])) }))
  }
  useEffect(() => {
    if (!cur) return
    setMsgs([])
    supabase.from('messages').select('*').eq('conversation_id', cur).is('deleted_at', null).order('created_at', { ascending: false }).limit(500)
      .then(r => { const l = ((r.data ?? []) as Msg[]).reverse(); setMsgs(l); sign(l) })
    const ch = supabase.channel('m-' + cur).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cur },
      (p: any) => { setMsgs(m => m.some(x => x.id === p.new.id) ? m : [...m, p.new]); sign([p.new]) }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cur])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length, cur])
  const loadMembers = async () => { const { data } = await supabase.from('conversation_members').select('user_id,role').eq('conversation_id', cur!); setMembers(data ?? []) }
  useEffect(() => { if (panel === 'members' && cur) loadMembers() }, [panel])

  const sendText = async () => {
    if (!cur || !text.trim()) return
    const t = text.trim(); setText('')
    const { error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: t, kind: 'text' }); setErr(error?.message ?? '')
  }
  const sendMedia = async (blob: Blob, name: string, kind: string, type: string) => {
    if (!cur) return
    setBusy(true); setErr('')
    const path = `${cur}/${uid}-${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type })
    if (up.error) { setBusy(false); return setErr(up.error.message) }
    const { error } = await supabase.from('messages').insert({ conversation_id: cur, sender_id: uid, body: name, kind, media_path: path })
    setBusy(false); setErr(error?.message ?? '')
  }
  const pickFile = (f?: File) => { if (!f) return; sendMedia(f, f.name, f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file', f.type || 'application/octet-stream') }
  const toggleRec = async () => {
    if (rec) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(stream); chunks.current = []
      mr.ondataavailable = e => chunks.current.push(e.data)
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); setRec(false)
        const type = (mr.mimeType || 'audio/webm').split(';')[0]; const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        sendMedia(new Blob(chunks.current, { type }), `voice.${ext}`, 'voice', type) }
      recRef.current = mr; mr.start(); setRec(true)
    } catch { setErr('Allow the microphone to send voice messages.') }
  }
  const dm = async (id: string) => { const { data, error } = await supabase.rpc('get_or_create_dm', { other: id }); if (error) return setErr(error.message); await loadConvs(); setCur(data) }
  const mkGroup = async () => {
    if (!gname.trim()) return setErr('Give the group a name.')
    const { data, error } = await supabase.rpc('create_group', { p_name: gname.trim(), p_desc: null, p_privacy: 'private', p_members: picked, p_admins: [] })
    if (error) return setErr(error.message); setGname(''); setPicked([]); await loadConvs(); setCur(data)
  }
  const addMember = async () => { const { error } = await supabase.from('conversation_members').insert({ conversation_id: cur, user_id: addId, role: 'member' }); setErr(error?.message ?? ''); setAddId(''); loadMembers() }
  const removeMember = async (id: string) => { const { error } = await supabase.from('conversation_members').delete().eq('conversation_id', cur!).eq('user_id', id); setErr(error?.message ?? ''); loadMembers() }

  const body = (m: Msg) => {
    const u = m.media_path ? urls[m.media_path] : undefined
    if (m.kind === 'image') return u ? <img src={u} className="max-w-[230px] rounded-xl" /> : <i>loading…</i>
    if (m.kind === 'video') return u ? <video src={u} controls playsInline className="max-w-[240px] rounded-xl" /> : <i>loading…</i>
    if (m.kind === 'voice') return u ? <audio src={u} controls className="max-w-[220px]" /> : <i>loading…</i>
    if (m.kind === 'file') return u ? <a href={u} target="_blank" rel="noreferrer" className="underline">📎 {m.body}</a> : <i>loading…</i>
    return <>{m.body}</>
  }
  const inIds = members.map(x => x.user_id)

  if (cur && curConv) return (
    <div className="chat-full">
      <div className="chat-head">
        <button className="text-2xl px-2" onClick={() => setCur(null)}>‹</button>
        <Avatar url={curConv.type === 'dm' ? names[curConv.other ?? '']?.avatar : null} name={title(curConv)} size={34} />
        <b className="ml-2 truncate">{title(curConv)}</b>
        <span className="ml-auto" />{curConv.type === 'group' && isAdmin && <button className="sym-btn !py-1" onClick={() => setPanel(panel === 'members' ? 'none' : 'members')}>Members</button>}
      </div>
      {panel === 'members' && <div className="p-3 bg-white/5 text-sm max-h-60 overflow-y-auto">
        {members.map(x => <div key={x.user_id} className="flex justify-between py-1"><span>{names[x.user_id]?.name ?? 'member'} <span className="text-gray-500">({x.role})</span></span>{x.user_id !== uid && <button className="text-red-400" onClick={() => removeMember(x.user_id)}>remove</button>}</div>)}
        <div className="flex gap-2 mt-2"><select className="sym-inp !mb-0" value={addId} onChange={e => setAddId(e.target.value)}><option value="">Add member…</option>{people.filter(p => !inIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.display_name || p.username}</option>)}</select><button className="sym-btn" onClick={addMember}>Add</button></div></div>}
      <div className="chat-msgs">
        {msgs.map(m => <div key={m.id} className={'flex ' + (m.sender_id === uid ? 'justify-end' : 'justify-start')}><div className={'bubble ' + (m.sender_id === uid ? 'me' : '')}>
          {m.sender_id !== uid && curConv.type === 'group' && <div className="text-xs text-cyan-300">{names[m.sender_id]?.name ?? 'member'}</div>}{body(m)}</div></div>)}
        <div ref={endRef} />
      </div>
      {err && <p className="text-amber-300 text-xs px-3">{err}</p>}
      <div className="chat-input">
        <label className="icon-btn">📎<input type="file" className="hidden" onChange={e => { pickFile(e.target.files?.[0]); e.target.value = '' }} /></label>
        <input className="sym-inp !mb-0 !rounded-full" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendText()} placeholder={busy ? 'Uploading…' : 'Message…'} />
        {text.trim() ? <button className="icon-btn" onClick={sendText}>➤</button> : <button className={'icon-btn' + (rec ? ' rec' : '')} onClick={toggleRec}>{rec ? '⏹' : '🎤'}</button>}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Messages</h2>
        <div className="flex gap-2"><button className="sym-btn" onClick={() => setPanel(panel === 'new' ? 'none' : 'new')}>✏️ New</button>{isAdmin && <button className="sym-btn" onClick={() => setPanel(panel === 'group' ? 'none' : 'group')}>👥 Group</button>}</div></div>
      {panel === 'new' && <div className="glass p-2 max-h-72 overflow-y-auto">{people.map(p => <button key={p.id} className="flex items-center gap-3 w-full p-2 text-left" onClick={() => dm(p.id)}><Avatar url={p.avatar_url} name={p.display_name || p.username} size={36} />{p.display_name || p.username}</button>)}</div>}
      {panel === 'group' && <div className="glass p-3"><input className="sym-inp" placeholder="Group name" value={gname} onChange={e => setGname(e.target.value)} />
        <p className="text-xs text-gray-400 mb-1">Add members:</p><div className="max-h-48 overflow-y-auto">{people.map(p => <label key={p.id} className="block text-sm py-1"><input type="checkbox" checked={picked.includes(p.id)} onChange={e => setPicked(e.target.checked ? [...picked, p.id] : picked.filter(x => x !== p.id))} /> {p.display_name || p.username}</label>)}</div>
        <button className="sym-btn mt-2 w-full" onClick={mkGroup}>Create group</button></div>}
      {convs.map(c => <button key={c.id} className="glass p-3 flex items-center gap-3 w-full text-left" onClick={() => setCur(c.id)}>
        <Avatar url={c.type === 'dm' ? names[c.other ?? '']?.avatar : null} name={title(c)} size={46} /><div><b>{title(c)}</b><div className="text-xs text-gray-400">{c.type === 'group' ? 'Group' : 'Direct message'}</div></div></button>)}
      {!convs.length && <p className="text-gray-400 text-sm text-center mt-8">No chats yet. {isAdmin ? 'Create a group or start a new chat.' : 'Start a new chat, or wait for an admin to add you to a group.'}</p>}
      {err && <p className="text-amber-300 text-sm">{err}</p>}
    </div>
  )
}
