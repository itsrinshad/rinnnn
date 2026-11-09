import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { ReactNode, useEffect, useState } from 'react'
import { useAuth } from './auth'
import { configured, supabase } from './lib'
import { GloryEntry, Leaderboard } from './pages'
import { Chat } from './ChatPage'
import { AdminLogin, Login } from './AuthPages'
import { AdminPanel } from './Admin'
import { Logo, SymbioteBg } from './Symbiote'
import { Announcements, Polls } from './pages2'
import { Home } from './Feed'
import { Create } from './Create'
import { Members, Profile } from './ProfilePage'

function Ico({ n }: { n: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" {...p}>
      {n === 'home' && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>}
      {n === 'chat' && <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />}
      {n === 'plus' && <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></>}
      {n === 'shield' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
      {n === 'rank' && <><circle cx="12" cy="8" r="6" /><path d="M8.2 13.5 7 22l5-3 5 3-1.2-8.5" /></>}
      {n === 'user' && <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
    </svg>
  )
}

function Guard({ children, admin, pending }: { children: ReactNode; admin?: boolean; pending?: boolean }) {
  const { session, profile, isAdmin } = useAuth()
  if (!session) return <Navigate to={admin ? '/admin-login' : '/login'} />
  if (!profile) return <p className="p-6 text-center animate-pulse">Loading…</p>
  if (['banned', 'suspended'].includes(profile.status)) return <p className="p-6">Your account is {profile.status}.</p>
  if (profile.status === 'pending' && !admin && !pending) return <p className="p-6">Your account is waiting for admin approval.</p>
  if (admin && !isAdmin) return <Navigate to="/" />
  return <>{children}</>
}

export default function App() {
  const { session, isAdmin, loading } = useAuth()
  const [pend, setPend] = useState(0)
  useEffect(() => {
    if (!isAdmin) return
    const f = () => supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => setPend(r.count ?? 0))
    f(); const t = setInterval(f, 15000); return () => clearInterval(t)
  }, [isAdmin])
  if (loading) return <><SymbioteBg /><div className="p-10 text-center animate-pulse"><Logo size={28} /></div></>
  const tab = (to: string, n: string, label: string, end?: boolean, badge?: number) => (
    <NavLink to={to} end={end} className={({ isActive }) => 'tab-i' + (isActive ? ' on' : '')} aria-label={label}>
      <Ico n={n} />{!!badge && <span className="tab-badge">{badge}</span>}
    </NavLink>
  )
  return (
    <div className="app">
      <SymbioteBg />
      {!configured && <p className="glass p-3 m-3 text-amber-300 text-sm">⚠ Not connected to Supabase. In Netlify, check VITE_SUPABASE_URL (starts with https://) and VITE_SUPABASE_ANON_KEY, then redeploy.</p>}
      <header className="topbar">
        <Link to="/"><Logo size={19} /></Link><span className="ml-auto" />
        {!session && <><Link to="/login" className="top-link">Login</Link><Link to="/admin-login" className="top-link">Admin</Link></>}
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Guard admin><AdminPanel /></Guard>} />
          <Route path="/admin/glory" element={<Guard admin><GloryEntry /></Guard>} />
          <Route path="/chat" element={<Guard><Chat /></Guard>} />
          <Route path="/create" element={<Guard><Create /></Guard>} />
          <Route path="/members" element={<Guard><Members /></Guard>} />
          <Route path="/announcements" element={<Guard><Announcements /></Guard>} />
          <Route path="/polls" element={<Guard><Polls /></Guard>} />
          <Route path="/profile" element={<Guard pending><Profile /></Guard>} />
          <Route path="/u/:username" element={<Guard><Profile /></Guard>} />
          <Route path="*" element={<p className="p-6">404 — page not found</p>} />
        </Routes>
      </main>
      {session && <nav className="tabbar">
        {tab('/', 'home', 'Home', true)}{tab('/chat', 'chat', 'Chat')}{tab('/create', 'plus', 'Create')}
        {isAdmin ? tab('/admin', 'shield', 'Admin', false, pend) : tab('/leaderboard', 'rank', 'Rank')}
        {tab('/profile', 'user', 'Profile')}
      </nav>}
      <div className="tabfill" />
    </div>
  )
}
