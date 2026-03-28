// ─── HomePage.jsx ─────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { announcements as annApi } from '../services/api';
import { normAnnouncementList } from '../utils/formatters';

export function HomePage({ setPage, user }) {
  const { data: annRaw, execute: fetchAnn, loading, error: annErr } = useApi(annApi.list);
  useEffect(() => { fetchAnn({ limit: 4 }); }, []);

  const recentAnn = normAnnouncementList(annRaw?.data || annRaw || []).slice(0, 4);

  const services = [
    { key:'request_letter',  icon:'📄', color:'#EBF9F0', label:'Request Official Letter',  desc:'Get identification, residence, conduct or school letters' },
    { key:'report_dispute',  icon:'⚖️', color:'#FFF8E7', label:'Report a Dispute',          desc:'Land, family, inheritance or neighbour conflicts' },
    { key:'report_security', icon:'🚨', color:'#FDECEA', label:'Report Security Issue',     desc:'Theft, violence, emergencies and suspicious activity' },
    { key:'report_illicit',  icon:'🚫', color:'#EEF2FF', label:'Illicit Activity Report',   desc:'Alcohol brewing, drugs, gender-based violence (anonymous)' },
    { key:'announcements',   icon:'📢', color:'#FEF3E2', label:'Announcements',             desc:'Barazas, health drives, government programs' },
    { key:user?'dashboard':'login', icon:'📊', color:'#EBF5FB', label:'Track My Requests', desc:'View status of all your submitted service requests' },
  ];

  return (
    <div className="animate-fade">
      <div className="flag-stripe" />
      <div className="hero">
        <div className="hero-badge">🇰🇪 Republic of Kenya · Jimo East Location</div>
        <h1>Chief Digital Services Portal</h1>
        <p>Access government services, report issues, and stay informed — all from your phone, without queuing at the office.</p>
        <div className="hero-cta">
          <button className="btn btn-gold btn-lg" onClick={() => setPage(user ? 'request_letter' : 'register')}>📄 Request a Letter</button>
          <button className="btn btn-outline btn-lg" style={{ borderColor:'rgba(255,255,255,0.5)', color:'white' }}
            onClick={() => setPage(user ? 'dashboard' : 'login')}>{user ? '📊 My Dashboard' : 'Sign In'}</button>
        </div>
        <div style={{ marginTop:28, display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
          {[{n:'20',l:'Villages Covered'},{n:'847+',l:'Registered Citizens'},{n:'243+',l:'Letters Issued'},{n:'68+',l:'Cases Resolved'}].map((s,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ color:'white', fontSize:24, fontWeight:800, fontFamily:"'Playfair Display',serif" }}>{s.n}</div>
              <div style={{ color:'rgba(255,255,255,0.65)', fontSize:12 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="services-section">
        <div className="section-title">Our Services</div>
        <div className="section-sub">Click any service to get started</div>
        <div className="services-grid">
          {services.map(s => (
            <div key={s.key} className="service-card" onClick={() => setPage(s.key)}>
              <div className="service-icon" style={{ background: s.color }}>{s.icon}</div>
              <h3>{s.label}</h3>
              <p>{s.desc}</p>
              <div className="service-arrow">→</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 48px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div>
            <div className="section-title" style={{ fontSize:20 }}>Latest Announcements</div>
            <div className="section-sub">Live updates from the Chief's office</div>
            <div className="announcement-card">
              {loading && <div style={{ padding:16, color:'var(--ink-faint)', fontSize:13 }}>Loading announcements…</div>}
              {annErr && !loading && (
                <div style={{ padding:16, fontSize:13, color:'var(--red)' }}>
                  {annErr}{' '}
                  <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft:8 }} onClick={() => fetchAnn({ limit: 4 })}>Retry</button>
                </div>
              )}
              {recentAnn.map(ann => (
                <div key={ann.id} className="announcement-item" onClick={() => setPage('announcements')}>
                  <div className={`ann-dot ${ann.type==='security'?'ann-dot-urgent':ann.type==='health'?'ann-dot-info':'ann-dot-normal'}`}></div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{ann.title}</div>
                    <div style={{ fontSize:12, color:'var(--ink-light)', lineHeight:1.4 }}>{(ann.body||'').substring(0,80)}…</div>
                    <div style={{ fontSize:11, color:'var(--ink-faint)', marginTop:4 }}>{ann.date}</div>
                  </div>
                </div>
              ))}
              {!loading && recentAnn.length === 0 && (
                <div style={{ padding:16, color:'var(--ink-faint)', fontSize:13 }}>No announcements yet.</div>
              )}
            </div>
          </div>
          <div>
            <div className="section-title" style={{ fontSize:20 }}>About the Chief</div>
            <div className="section-sub">Jimo East Location Administration</div>
            <div className="card">
              <div className="card-body">
                <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16 }}>
                  <div style={{ width:64,height:64,borderRadius:'50%',background:'var(--forest)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gold)',fontSize:28,fontWeight:800,flexShrink:0 }}>JO</div>
                  <div>
                    <div style={{ fontSize:17,fontWeight:700,color:'var(--ink)' }}>Chief John Otieno Otieno</div>
                    <div style={{ fontSize:13,color:'var(--ink-light)' }}>Chief, Jimo East Location</div>
                    <div style={{ fontSize:12,color:'var(--forest)',marginTop:4 }}>📍 Jimo East, Sub-County</div>
                  </div>
                </div>
                <p style={{ fontSize:13,color:'var(--ink-mid)',lineHeight:1.7,marginBottom:12 }}>
                  Chief Otieno serves 20 villages and is committed to transparent, efficient service delivery under the National Government Administration Officers (NGAO) structure.
                </p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span className="badge badge-green">⚡ Services Active</span>
                  <span className="badge badge-gold">20 Villages</span>
                  <span className="badge badge-blue">NGAO Certified</span>
                </div>
                <div className="divider"/>
                <div style={{ display:'flex', gap:12, fontSize:13, color:'var(--ink-light)', flexWrap:'wrap' }}>
                  <span>📱 0700 XXX XXX</span>
                  <span>📍 Mon–Fri, 8am–5pm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="secure-banner">
        <span>🔒</span>
        <span>This portal is secured by the Kenya National Government. Your data is protected under the Data Protection Act 2019.</span>
      </div>
    </div>
  );
}
export default HomePage;
