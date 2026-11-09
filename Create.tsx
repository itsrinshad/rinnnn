import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from './lib'
import { useAuth } from './auth'
import { BG, uploadMedia } from './Social'

export function Create() {
  const { session } = useAuth(); const uid = session!.user.id; const nav = useNavigate(); const [q] = useSearchParams()
  const [mode, setMode] = useState<'post' | 'story' | 'achievement'>(q.get('m') === 'story' ? 'story' : 'post')
  const [file, setFile] = useState<File | null>(null); const [music, setMusic] = useState<File | null>(null); const [mtitle, setMtitle] = useState('')
  const [cap, setCap] = useState(''); const [title, setTitle] = useState("Today's glory"); const [val, setVal] = useState(''); const [bg, setBg] = useState(0); const [alsoPost, setAlsoPost] = useState(true)
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  useEffect(() => {
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    supabase.from('glory_daily').select('gained').eq('member_id', uid).eq('day', day).maybeSingle().then(r => { if (r.data) setVal(String(r.data.gained)) })
  }, [])
  const preview = file ? URL.createObjectURL(file) : ''
  const submit = async () => {
    setMsg('')
    try {
      if (mode === 'achievement' && !val.trim()) return setMsg('Write your achievement (e.g. 450 glory).')
      if (mode !== 'achievement' && !file && !(mode === 'post' && cap.trim())) return setMsg('Choose a photo or video' + (mode === 'post' ? ', or write something.' : '.'))
      setBusy(true)
      const media = file ? await uploadMedia(file, uid) : null
      const mpath = music ? await uploadMedia(music, uid) : null
      const kind = file ? (file.type.startsWith('video/') ? 'video' : 'image') : 'text'
      const mt = mtitle.trim() || music?.name.replace(/\.[^.]+$/, '') || null
      if (mode === 'post') {
        const { error } = await supabase.from('posts').insert({ author_id: uid, kind, caption: cap.trim() || null, media_path: media, music_path: mpath, music_title: mt }); if (error) throw error
        nav('/profile')
      } else {
        const isAch = mode === 'achievement'
        const { error } = await supabase.from('stories').insert({ author_id: uid, kind: isAch ? 'text' : kind, media_path: isAch ? null : media, caption: isAch ? `${title}\n${val.trim()}` : cap.trim() || null, bg: String(bg), music_path: mpath, music_title: mt }); if (error) throw error
        if (isAch && alsoPost) await supabase.from('posts').insert({ author_id: uid, kind: 'text', caption: `🏆 ${title}: ${val.trim()}`, music_path: mpath, music_title: mt })
        nav('/')
      }
    } catch (e: any) { setMsg(e?.message ?? 'Upload failed') }
    setBusy(false)
  }
  return (
    <div className="glass p-4 space-y-3">
      <div className="tabs !mb-0">{(['post', 'story', 'achievement'] as const).map(m => <button key={m} className={'tab' + (mode === m ? ' on' : '')} onClick={() => setMode(m)}>{m === 'post' ? '📷 Post' : m === 'story' ? '⭕ Story' : '🏆 Achievement'}</button>)}</div>
      {mode === 'achievement' ? (<>
        <div className="story-card !h-48 rounded-2xl" style={{ background: BG[bg] }}><div className="text-lg">{title}</div><div className="text-5xl font-black">{val || '…'}</div></div>
        <input className="sym-inp" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="sym-inp" placeholder="Your achievement (e.g. 450 glory, 12 kills)" value={val} onChange={e => setVal(e.target.value)} />
        <div className="flex gap-2">{BG.map((b, i) => <button key={i} onClick={() => setBg(i)} className={'w-9 h-9 rounded-full ' + (bg === i ? 'ring-2 ring-white' : '')} style={{ background: b }} />)}</div>
        <label className="text-sm"><input type="checkbox" checked={alsoPost} onChange={e => setAlsoPost(e.target.checked)} /> Also post it on my profile</label>
      </>) : (<>
        <label className="upload-box">{file ? (file.type.startsWith('video/') ? <video src={preview} className="max-h-72 rounded-xl" controls /> : <img src={preview} className="max-h-72 rounded-xl" />) : <span>📤 Tap to choose photo / video</span>}
          <input type="file" accept="image/*,video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
        <textarea className="sym-inp" rows={3} placeholder={mode === 'post' ? 'Write a caption…' : 'Story caption (optional)'} value={cap} onChange={e => setCap(e.target.value)} />
      </>)}
      <div className="rounded-xl bg-white/5 p-3 text-sm">
        <div className="mb-2">🎵 Add music (optional)</div>
        <input type="file" accept="audio/*" className="text-xs mb-2" onChange={e => setMusic(e.target.files?.[0] ?? null)} />
        {music && <input className="sym-inp !mb-0" placeholder="Song name" value={mtitle} onChange={e => setMtitle(e.target.value)} />}
      </div>
      <button className="sym-btn w-full" onClick={submit} disabled={busy}>{busy ? 'Uploading… please wait' : mode === 'post' ? 'Share post' : 'Share story'}</button>
      {msg && <p className="text-amber-300 text-sm">{msg}</p>}
      <p className="text-xs text-gray-500">Stories disappear after 24 hours. Posts stay on your profile.</p>
    </div>
  )
}
