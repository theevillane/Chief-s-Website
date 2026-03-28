// ─── Topbar.jsx ───────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notifications as notifApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { timeAgo } from '../utils/formatters';

export function Topbar({ page, setPage, onLogout }) {
  const { user, isAdmin, isLoggedIn } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifRaw, execute: fetchNotifs } = useApi(notifApi.list);

  const notifs     = notifRaw?.data || [];
  const unreadCount = notifRaw?.meta?.unread || 0;

  const navItems = isLoggedIn
    ? (isAdmin
        ? [{ key:'admin', label:'Dashboard' },{ key:'announcements', label:'Announcements' }]
        : [{ key:'home', label:'Home' },{ key:'dashboard', label:'My Requests' },{ key:'announcements', label:'Announcements' }])
    : [{ key:'home', label:'Home' },{ key:'announcements', label:'Announcements' },{ key:'about', label:'About' }];

  const handleNotifOpen = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) fetchNotifs();
  };

  return (
    <div className="topbar">
      <div className="topbar-brand" style={{ cursor:'pointer' }} onClick={() => setPage('home')}>
        <div className="topbar-logo">JE</div>
        <div>
          <div className="topbar-title">Jimo East</div>
          <div className="topbar-subtitle">Chief Digital Services Portal</div>
        </div>
      </div>

      <nav className="topbar-nav">
        {navItems.map(n => (
          <button key={n.key} className={page === n.key ? 'active' : ''} onClick={() => setPage(n.key)}>{n.label}</button>
        ))}
      </nav>

      <div className="topbar-actions">
        {isLoggedIn ? (
          <>
            <div style={{ position:'relative' }}>
              <button className="btn btn-ghost btn-sm" style={{ color:'rgba(255,255,255,0.8)', padding:'6px 10px' }}
                onClick={handleNotifOpen}>
                🔔
                {unreadCount > 0 && <span className="notif-dot"></span>}
              </button>
              {notifOpen && (
                <div style={{ position:'fixed', top:66, right:16, width:300, background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-lg)', zIndex:150 }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14 }}>Notifications</div>
                  {notifs.length === 0
                    ? <div style={{ padding:16, color:'var(--ink-faint)', fontSize:13, textAlign:'center' }}>No notifications</div>
                    : notifs.map((n, i) => (
                      <div key={i} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize:13, display:'flex', gap:10, cursor:'pointer' }}
                        onClick={() => setNotifOpen(false)}>
                        <span>{n.read ? '⚪' : '🔵'}</span>
                        <div>
                          <div style={{ color:'var(--ink-mid)', lineHeight:1.4 }}>{n.message}</div>
                          <div style={{ color:'var(--ink-faint)', fontSize:11, marginTop:2 }}>{timeAgo(n.created_at)}</div>
                        </div>
                      </div>
                    ))
                  }
                  <div style={{ padding:'10px 16px', textAlign:'center' }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize:12, color:'var(--forest)' }} onClick={() => setNotifOpen(false)}>Close</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}
              onClick={() => setPage(isAdmin ? 'admin' : 'dashboard')}>
              <div className="avatar" style={{ background:'rgba(255,255,255,0.2)', color:'white' }}>{user?.name?.[0]}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }} onClick={onLogout}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" style={{ color:'rgba(255,255,255,0.8)' }} onClick={() => setPage('login')}>Sign In</button>
            <button className="btn btn-gold btn-sm" onClick={() => setPage('register')}>Register</button>
          </>
        )}
      </div>
    </div>
  );
}
export default Topbar;
