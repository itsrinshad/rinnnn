// Shared small UI pieces: story-ring avatar, round badge bubbles
export const BADGE_ICON: Record<string, string> = {
  glory_champion: '🏆', weekly_mvp: '⭐', most_active: '🔥', tournament_winner: '🥇',
  guild_veteran: '🛡️', top_contributor: '💎', founding_member: '👑',
}
export const badgeIcon = (code?: string | null) => (code && BADGE_ICON[code]) || '🏅'

export function Avatar({ src, name, size = 56, ring = true, onClick }: { src?: string | null; name?: string | null; size?: number; ring?: boolean; onClick?: () => void }) {
  return (
    <span className={ring ? 'ring' : 'plain'} style={{ width: size, height: size }} onClick={onClick}>
      <span className="in">
        {src ? <img src={src} alt="" loading="lazy" /> : <span className="ph" style={{ fontSize: size * 0.42 }}>{(name || '?').slice(0, 1).toUpperCase()}</span>}
      </span>
    </span>
  )
}

export function BadgeBubble({ code, name, onRemove }: { code?: string | null; name: string; onRemove?: () => void }) {
  return (
    <div className="bb" onClick={onRemove} title={onRemove ? 'Tap to remove' : name}>
      <span className="gold"><span className="in"><span className="ico">{badgeIcon(code)}</span></span></span>
      <small>{name}</small>
    </div>
  )
}

// Built-in line icons (no icon library needed)
type IP = { size?: number; className?: string }
const mk = (d: string) => ({ size = 20, className }: IP) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={d} /></svg>
)
export const Home = mk('M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z')
export const MessageCircle = mk('M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.8A8 8 0 1 1 21 12z')
export const Trophy = mk('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3')
export const Bell = mk('M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0')
export const User = mk('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')
export const Shield = mk('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
export const ArrowLeft = mk('M19 12H5M12 19l-7-7 7-7')
export const Mic = mk('M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3')
export const Paperclip = mk('M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5')
export const Send = mk('M22 2L11 13M22 2l-7 20-4-9-9-4z')
export const Square = mk('M6 6h12v12H6z')
export const Trash2 = mk('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6')
export const Users = mk('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8')
export const X = mk('M18 6L6 18M6 6l12 12')
export const Camera = mk('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')
export const LogOut = mk('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9')
export const PenSquare = mk('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z')
export const Vote = mk('M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9')
