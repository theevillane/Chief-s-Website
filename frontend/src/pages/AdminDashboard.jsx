import { useState, useEffect } from 'react';
import { useApi, useSubmit } from '../hooks/useApi';
import { admin as adminApi, letters as lettersApi, announcements as annApi, disputes as disputesApi, security as securityApi } from '../services/api';
import { normLetterList, normVillageStats, buildKpis, formatDate, normDispute, normSecurity } from '../utils/formatters';
import { toast } from '../components/Toast';

const VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];

const statusConfig = {
  submitted:    { label:'Submitted',    color:'badge-blue' },
  under_review: { label:'Under Review', color:'badge-amber' },
  approved:     { label:'Approved',     color:'badge-green' },
  rejected:     { label:'Rejected',     color:'badge-red' },
  resolved:     { label:'Resolved',     color:'badge-gray' },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, color:'badge-gray' };
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
}

export default function AdminDashboard({ user, setPage }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [rejectModal, setRejectModal]     = useState(null); // letter being rejected
  const [rejectReason, setRejectReason]   = useState('');
  const [openInline, setOpenInline]       = useState(null); // { key, action }

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: statsRaw, execute: fetchStats, loading: statsLoading, error: statsError } = useApi(adminApi.stats);
  const { data: lettersRaw, execute: fetchLetters, loading: lettersLoad, error: lettersErr } = useApi(lettersApi.list);
  const { data: villagesRaw, execute: fetchVillages, loading: villagesLoading, error: villagesErr } = useApi(adminApi.villages);
  const { data: citizensRaw, execute: fetchCitizens, loading: citizensLoading, error: citizensErr } = useApi(adminApi.citizens);
  const { data: disputesRaw, execute: fetchDisputes, loading: disputesLoading, error: disputesErr } = useApi(disputesApi.list);
  const { data: securityRaw, execute: fetchSecurity, loading: securityLoading, error: securityErr } = useApi(securityApi.list);
  const { data: annRaw, execute: fetchAnnouncements, loading: annListLoading, error: annListErr } = useApi(annApi.list);

  // Announcement form state
  const [annForm, setAnnForm] = useState({ title:'', body:'', category:'baraza', target_villages:['all'], send_sms:false });
  const { submit: publishAnn, loading: annLoading, success: annSuccess, error: annError } = useSubmit(annApi.create);

  // Load on section change
  useEffect(() => {
    if (activeSection === 'overview' || activeSection === 'requests') {
      fetchStats();
      fetchLetters({ page:1, limit:50 });
    }
    if (activeSection === 'villages') fetchVillages();
    if (activeSection === 'citizens') fetchCitizens({ page:1, limit:30 });
    if (activeSection === 'disputes') fetchDisputes({ page:1, limit:50 });
    if (activeSection === 'security') fetchSecurity({ page:1, limit:50 });
    if (activeSection === 'announce') fetchAnnouncements({ page:1, limit:10 });
  }, [activeSection]);

  const stats      = statsRaw?.data || statsRaw || {};
  const kpis       = buildKpis(stats);
  const trend      = stats.trend || [];
  const trendMax   = Math.max(...trend.map(d => d.count), 1);

  const allLetters = normLetterList(lettersRaw?.data || lettersRaw || []);
  const filtered   = statusFilter === 'all' ? allLetters : allLetters.filter(r => r.status === statusFilter);
  const villages   = normVillageStats(villagesRaw?.data || villagesRaw || []);
  const citizens   = (citizensRaw?.data || citizensRaw || []);
  const disputes   = (disputesRaw?.data || disputesRaw || []).map(normDispute);
  const security   = (securityRaw?.data || securityRaw || []).map(normSecurity);
  const recentAnnouncements = annRaw?.data || annRaw || [];

  const truncate = (txt, n) => {
    if (!txt) return '';
    const s = String(txt);
    return s.length > n ? `${s.slice(0, n)}…` : s;
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async (letter) => {
    try {
      await lettersApi.approve(letter._mongoId, { admin_notes: 'Approved by chief' });
      toast.success(`Letter ${letter.id} approved. PDF generated and SMS sent to citizen.`);
      fetchLetters({ page:1, limit:50 });
      fetchStats();
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    try {
      await lettersApi.reject(rejectModal._mongoId, { rejection_reason: rejectReason });
      toast.success(`Letter ${rejectModal.id} rejected. Citizen notified via SMS.`);
      setRejectModal(null);
      setRejectReason('');
      fetchLetters({ page:1, limit:50 });
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    }
  };

  const handlePublishAnn = async () => {
    const title = annForm.title.trim();
    const body  = annForm.body.trim();
    if (title.length < 5 || body.length < 10) return;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    const res = await publishAnn({ ...annForm, title, body, expiry_date: expiry.toISOString() });
    if (res?.success) {
      setAnnForm({ title:'', body:'', category:'baraza', target_villages:['all'], send_sms:false });
      toast.success('Announcement published.');
      fetchAnnouncements({ page:1, limit:10 });
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    const yes = window.confirm('Delete this announcement? It will be removed from the portal.');
    if (!yes) return;
    try {
      await annApi.remove(id);
      toast.success('Announcement removed.');
      fetchAnnouncements({ page:1, limit:10 });
    } catch (err) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const sidebarItems = [
    { key:'overview',  icon:'📊', label:'Overview' },
    { key:'requests',  icon:'📄', label:'Service Requests',
      count: allLetters.filter(r => ['submitted','under_review'].includes(r.status)).length || undefined },
    { key:'disputes',  icon:'⚖️', label:'Disputes' },
    { key:'security',  icon:'🚨', label:'Security Reports' },
    { key:'announce',  icon:'📢', label:'Announcements' },
    { key:'villages',  icon:'🗺️', label:'Village Analytics' },
    { key:'citizens',  icon:'👥', label:'Citizens' },
  ];

  return (
    <div className="dashboard-layout">

      {/* ── Sidebar ── */}
      <div className="sidebar">
        <div style={{ padding:'8px 10px 16px', borderBottom:'1px solid var(--border)', marginBottom:16 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div className="avatar" style={{ background:'var(--forest)', color:'var(--gold)' }}>
              {user?.name?.[0] || 'A'}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>{user?.name?.split(' ').slice(0,2).join(' ')}</div>
              <div style={{ fontSize:11, color:'var(--ink-faint)', textTransform:'capitalize' }}>{user?.role?.replace('_',' ')}</div>
            </div>
          </div>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Main Menu</div>
          {sidebarItems.map(item => (
            <button key={item.key} className={`sidebar-btn ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => setActiveSection(item.key)}>
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count > 0 && <span className="count">{item.count}</span>}
            </button>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Quick Links</div>
          <button className="sidebar-btn" onClick={() => setPage('home')}><span className="icon">🌐</span><span>View Portal</span></button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="main-content">

        {/* ── Overview ── */}
        {activeSection === 'overview' && (
          <div className="animate-fade">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:22 }}>Administration Dashboard</h2>
                <p style={{ fontSize:13, color:'var(--ink-light)' }}>
                  Jimo East Location · {new Date().toLocaleDateString('en-KE',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </p>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { fetchStats(); fetchLetters({ page:1, limit:50 }); }}>🔄 Refresh</button>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveSection('announce')}>📢 Announce</button>
              </div>
            </div>

            {/* KPI cards */}
            {statsError && (
              <div className="alert alert-error" style={{ marginBottom:16, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
                <span>⚠️</span><span>{statsError}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchStats()}>Retry</button>
              </div>
            )}
            {statsLoading
              ? <p style={{ color:'var(--ink-faint)' }}>Loading statistics…</p>
              : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
                  {kpis.map((k, i) => (
                    <div key={i} className="kpi-card" style={{ color:k.color }}>
                      <div className="kpi-num">{k.n}</div>
                      <div className="kpi-label" style={{ color:'var(--ink-light)' }}>{k.label}</div>
                      <div className="kpi-trend">{k.change}</div>
                    </div>
                  ))}
                </div>
              )
            }

            {/* Trend bar chart */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:24 }}>
              <div className="card">
                <div className="card-header" style={{ fontWeight:700, fontSize:14 }}>📈 Requests This Week</div>
                <div className="card-body">
                  <div className="bar-chart">
                    {trend.map((d, i) => (
                      <div key={i} className="bar-item">
                        <div className="bar-fill" style={{
                          height: `${Math.round((d.count / trendMax) * 90) + 4}px`,
                          background:'var(--forest-light)'
                        }}></div>
                        <div className="bar-label">{new Date(d.date).toLocaleDateString('en-KE',{ weekday:'short' })}</div>
                      </div>
                    ))}
                    {trend.length === 0 && <p style={{ color:'var(--ink-faint)', fontSize:13 }}>No data yet.</p>}
                  </div>
                </div>
              </div>

              {/* Pending actions */}
              <div className="card">
                <div className="card-header" style={{ fontWeight:700, fontSize:14 }}>⚡ Pending Actions</div>
                <div className="card-body" style={{ padding:0 }}>
                  {[
                    { icon:'📄', key:'requests', label:`${allLetters.filter(r=>['submitted','under_review'].includes(r.status)).length} letters need review`, color:'var(--blue)' },
                    { icon:'⚖️', key:'disputes', label:`${stats.disputes?.open || 0} open disputes`, color:'var(--amber)' },
                    { icon:'🚨', key:'security', label:`${stats.security?.urgent || 0} urgent security reports`, color:'var(--red)' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center', cursor:'pointer' }}
                      onClick={() => setActiveSection(item.key)}>
                      <span style={{ fontSize:18 }}>{item.icon}</span>
                      <span style={{ fontSize:13, color:'var(--ink-mid)', flex:1 }}>{item.label}</span>
                      <span style={{ color:'var(--ink-faint)' }}>→</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent requests table */}
            <div className="card">
              <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Recent Requests</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setActiveSection('requests')}>View All</button>
              </div>
              <div className="table-wrapper" style={{ border:'none' }}>
                <table className="data-table">
                  <thead><tr><th>Ref</th><th>Type</th><th>Citizen</th><th>Village</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {allLetters.slice(0, 6).map(r => (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontSize:12 }}>{r.id}</td>
                        <td style={{ fontWeight:500, fontSize:13 }}>{r.type}</td>
                        <td style={{ fontSize:13 }}>{r.citizen}</td>
                        <td><span className="village-pill">{r.village}</span></td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          {['submitted','under_review'].includes(r.status) ? (
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn btn-sm" style={{ background:'var(--forest-pale)', color:'var(--forest)', padding:'4px 8px', fontSize:12 }}
                                onClick={() => handleApprove(r)}>✅</button>
                              <button className="btn btn-sm" style={{ background:'var(--red-pale)', color:'var(--red)', padding:'4px 8px', fontSize:12 }}
                                onClick={() => { setRejectModal(r); setRejectReason(''); }}>❌</button>
                            </div>
                          ) : <span style={{ fontSize:12, color:'var(--ink-faint)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                    {allLetters.length === 0 && !lettersLoad && (
                      <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--ink-faint)', padding:24 }}>No requests yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Service Requests ── */}
        {activeSection === 'requests' && (
          <div className="animate-fade">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:20 }}>📄 Service Requests</h2>
              <select className="form-input form-select" style={{ width:'auto', padding:'6px 32px 6px 10px', fontSize:13 }}
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                {Object.entries(statusConfig).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {lettersErr && (
              <div className="alert alert-error" style={{ marginBottom:12, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
                <span>⚠️</span><span>{lettersErr}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchLetters({ page:1, limit:50 })}>Retry</button>
              </div>
            )}
            {lettersLoad && <p style={{ color:'var(--ink-faint)' }}>Loading…</p>}
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Ref No.</th><th>Type</th><th>Citizen</th><th>Village</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><span className="ref-num" style={{ padding:'2px 8px', fontSize:11 }}>{r.id}</span></td>
                      <td style={{ fontWeight:500, fontSize:13 }}>{r.type}</td>
                      <td style={{ fontSize:13 }}>{r.citizen}</td>
                      <td><span className="village-pill">{r.village}</span></td>
                      <td style={{ fontSize:13, color:'var(--ink-light)' }}>{r.date}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        {['submitted','under_review'].includes(r.status) ? (
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-sm" style={{ background:'var(--forest-pale)', color:'var(--forest)', padding:'4px 8px', fontSize:12 }}
                              onClick={() => handleApprove(r)}>✅ Approve</button>
                            <button className="btn btn-sm" style={{ background:'var(--red-pale)', color:'var(--red)', padding:'4px 8px', fontSize:12 }}
                              onClick={() => { setRejectModal(r); setRejectReason(''); }}>❌ Reject</button>
                          </div>
                        ) : <span style={{ fontSize:12, color:'var(--ink-faint)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !lettersLoad && (
                    <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--ink-faint)', padding:24 }}>No requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Announcements ── */}
        {activeSection === 'announce' && (
          <div className="animate-fade">
            <h2 style={{ fontSize:20, marginBottom:20 }}>📢 Publish Announcement</h2>
            <div className="card" style={{ maxWidth:580 }}>
              <div className="card-header" style={{ fontWeight:700, fontSize:14 }}>✏️ New Announcement</div>
              <div className="card-body">
                {annSuccess && <div className="alert alert-success" style={{ marginBottom:12 }}><span>✅</span><span>Announcement published!</span></div>}
                {annError   && <div className="alert alert-error"   style={{ marginBottom:12 }}><span>⚠️</span><span>{annError}</span></div>}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input form-select" value={annForm.category}
                    onChange={e => setAnnForm(f => ({ ...f, category: e.target.value }))}>
                    {['baraza','health','government','development','security','general'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="Announcement title"
                    value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Message *</label>
                  <textarea className="form-input form-textarea" placeholder="Full announcement text…" style={{ minHeight:100 }}
                    value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Villages</label>
                  <select className="form-input form-select"
                    onChange={e => setAnnForm(f => ({ ...f, target_villages: e.target.value === 'all' ? ['all'] : [e.target.value] }))}>
                    <option value="all">All Villages</option>
                    {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <input type="checkbox" id="sms" checked={annForm.send_sms}
                    onChange={e => setAnnForm(f => ({ ...f, send_sms: e.target.checked }))}
                    style={{ width:18, height:18, accentColor:'var(--forest)' }} />
                  <label htmlFor="sms" style={{ fontSize:14, cursor:'pointer' }}>Send SMS to all matching citizens</label>
                </div>
                {annForm.send_sms && annForm.body.length > 0 && (
                  <div style={{ background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:'12px 14px', border:'1px solid var(--border)', marginBottom:12 }}>
                    <div style={{ fontWeight:600, marginBottom:6, fontSize:13 }}>📱 SMS Preview (what citizens will receive)</div>
                    {(() => {
                      const smsPreview = `Jimo East Notice: ${annForm.title}. ${annForm.body.substring(0, 100)}${annForm.body.length > 100 ? '...' : ''} Visit jimoeast.go.ke`;
                      const smsLen = smsPreview.length;
                      const smsColor = smsLen <= 160 ? 'var(--forest)' : smsLen <= 320 ? 'var(--amber)' : 'var(--red)';
                      return (
                        <>
                          <div style={{ fontSize:13, color:'var(--ink-mid)', fontFamily:"'DM Mono',monospace" }}>{smsPreview}</div>
                          <div style={{ fontSize:12, marginTop:8, color:smsColor }}>SMS characters used: {smsLen} / 160</div>
                          {smsLen > 160 && <div style={{ fontSize:12, marginTop:2, color:smsColor }}>⚠ This will be sent as {Math.ceil(smsLen / 160)} SMS messages per recipient</div>}
                          <div style={{ fontSize:12, marginTop:4, color:'var(--ink-light)' }}>
                            {annForm.target_villages.includes('all') ? '📡 Recipients: all registered citizens' : `📡 Recipients: citizens in ${annForm.target_villages.join(', ')}`}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handlePublishAnn}
                  disabled={
                    annLoading ||
                    annForm.title.trim().length < 5 ||
                    annForm.body.trim().length < 10
                  }>
                  {annLoading ? '⏳ Publishing…' : '📢 Publish Announcement'}
                </button>
                <p style={{ fontSize:12, color:'var(--ink-faint)', marginTop:8 }}>
                  📅 Announcements auto-expire after 7 days. You can delete them manually at any time.
                </p>
              </div>
            </div>
            <div className="card" style={{ maxWidth:580, marginTop:14 }}>
              <div className="card-header" style={{ fontWeight:700, fontSize:14 }}>Recent Announcements</div>
              <div className="card-body" style={{ padding:0 }}>
                {annListErr && <div className="alert alert-error" style={{ margin:12 }}><span>⚠️</span><span>{annListErr}</span></div>}
                {annListLoading && <p style={{ padding:12, color:'var(--ink-faint)' }}>Loading…</p>}
                {!annListLoading && recentAnnouncements.length === 0 && <p style={{ padding:12, color:'var(--ink-faint)' }}>No announcements yet.</p>}
                {recentAnnouncements.map((a, i) => (
                  <div key={a._id || i} style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', gap:8, alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{a.title}</div>
                      <div style={{ fontSize:12, color:'var(--ink-faint)' }}>{formatDate(a.created_at)}</div>
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => handleDeleteAnnouncement(a._id)}>🗑 Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Village Analytics ── */}
        {activeSection === 'villages' && (
          <div className="animate-fade">
            <h2 style={{ fontSize:20, marginBottom:20 }}>🗺️ Village Analytics</h2>
            {villagesErr && (
              <div className="alert alert-error" style={{ marginBottom:12, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
                <span>⚠️</span><span>{villagesErr}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchVillages()}>Retry</button>
              </div>
            )}
            {villagesLoading && <p style={{ color:'var(--ink-faint)', marginBottom:12 }}>Loading village data…</p>}
            <div className="stats-grid" style={{ marginBottom:16 }}>
              {(() => {
                const src = (villagesRaw?.data || villagesRaw || []);
                const totals = src.reduce((acc, v) => ({
                  citizens: acc.citizens + (v.citizens || 0),
                  letters:   acc.letters   + (v.letters || 0),
                  disputes:  acc.disputes  + (v.disputes || 0),
                  security:  acc.security  + (v.security || 0),
                }), { citizens:0, letters:0, disputes:0, security:0 });
                return [
                  { n: totals.citizens, l:'Total citizens', c:'var(--forest)' },
                  { n: totals.letters,   l:'Total letters', c:'var(--blue)' },
                  { n: totals.disputes,  l:'Total disputes', c:'var(--amber)' },
                  { n: totals.security,  l:'Total security reports', c:'var(--red)' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-num" style={{ color:s.c }}>{s.n}</div>
                    <div className="stat-label">{s.l}</div>
                  </div>
                ));
              })()}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
              {villages.map(v => (
                <div key={v.village} className="card">
                  <div className="card-body">
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:10, display:'flex', justifyContent:'space-between' }}>
                      <span>📍 {v.village}</span>
                      <span className="badge badge-gray">{v.requests} req.</span>
                    </div>
                    {[
                      { label:'Letters',  val:v.requests, max:20, color:'var(--forest-light)' },
                      { label:'Disputes', val:v.disputes, max:10, color:'var(--amber)' },
                      { label:'Security', val:v.security, max:10, color:'var(--red)' },
                    ].map(m => (
                      <div key={m.label} style={{ marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                          <span style={{ color:'var(--ink-light)' }}>{m.label}</span>
                          <span style={{ fontWeight:600 }}>{m.val}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width:`${Math.min((m.val/m.max)*100,100)}%`, background:m.color }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {villages.length === 0 && !villagesLoading && !villagesErr && (
                <p style={{ color:'var(--ink-faint)', gridColumn:'1/-1' }}>No village data.</p>
              )}
            </div>
            <VillageTable villagesRaw={villagesRaw} />
          </div>
        )}

        {/* ── Citizens ── */}
        {activeSection === 'citizens' && (
          <div className="animate-fade">
            <h2 style={{ fontSize:20, marginBottom:20 }}>👥 Citizen Registry</h2>
            {citizensErr && (
              <div className="alert alert-error" style={{ marginBottom:12, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
                <span>⚠️</span><span>{citizensErr}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchCitizens({ page:1, limit:30 })}>Retry</button>
              </div>
            )}
            {citizensLoading && <p style={{ color:'var(--ink-faint)', marginBottom:12 }}>Loading citizens…</p>}
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Village</th><th>Phone</th><th>Verified</th><th>Role</th></tr></thead>
                <tbody>
                  {citizens.map((c, i) => (
                    <tr key={c._id || i}>
                      <td style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <div className="avatar" style={{ width:28, height:28, fontSize:12, background:'var(--forest-pale)', color:'var(--forest)' }}>{c.name?.[0]}</div>
                        <span style={{ fontWeight:500 }}>{c.name}</span>
                      </td>
                      <td><span className="village-pill">{c.village}</span></td>
                      <td style={{ fontSize:13, color:'var(--ink-light)' }}>{c.display_phone || c.phone}</td>
                      <td>{c.verified ? <span className="badge badge-green">✅ Yes</span> : <span className="badge badge-gray">Pending</span>}</td>
                      <td><span className="badge badge-blue">{c.role}</span></td>
                    </tr>
                  ))}
                  {citizens.length === 0 && !citizensLoading && (
                    <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--ink-faint)', padding:24 }}>No citizens loaded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Disputes ── */}
        {activeSection === 'disputes' && (
          <div className="animate-fade">
            <h2 style={{ fontSize:20, marginBottom:16 }}>⚖️ Dispute Management</h2>

            {disputesErr && (
              <div className="alert alert-error" style={{ marginBottom:12, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
                <span>⚠️</span><span>{disputesErr}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchDisputes({ page:1, limit:50 })}>Retry</button>
              </div>
            )}

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref No.</th>
                    <th>Type</th>
                    <th>Parties</th>
                    <th>Village</th>
                    <th>Filed Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputesLoading && (
                    <tr>
                      <td colSpan={7} style={{ textAlign:'center', padding:24, color:'var(--ink-faint)' }}>
                        <span className="pulse">⏳</span> Loading disputes…
                      </td>
                    </tr>
                  )}

                  {!disputesLoading && disputes.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign:'center', padding:24, color:'var(--ink-faint)' }}>
                        No disputes filed yet.
                      </td>
                    </tr>
                  )}

                  {!disputesLoading && disputes.map((d) => {
                    const rowKey = d._mongoId || d.id;
                    const inlineKey = openInline?.key;
                    const inlineAction = openInline?.action;
                    const isOpen = inlineKey === rowKey;
                    const showSchedule = isOpen && inlineAction === 'schedule';
                    const showNotes    = isOpen && inlineAction === 'notes';
                    const showResolve  = isOpen && inlineAction === 'resolve';
                    const showSeeMore  = isOpen && inlineAction === 'see_more';

                    return (
                      <>
                        <tr key={rowKey}>
                          <td><span className="ref-num" style={{ padding:'2px 8px', fontSize:11 }}>{d.ref_number || d.id}</span></td>
                          <td style={{ fontWeight:500, fontSize:13 }}>{d.type || '—'}</td>
                          <td style={{ fontSize:13 }}>{d.parties || '—'}</td>
                          <td><span className="village-pill">{d.village || '—'}</span></td>
                          <td style={{ fontSize:13, color:'var(--ink-light)' }}>{formatDate(d.created_at)}</td>
                          <td>
                            <StatusBadge status={d.status} />
                            {d.status === 'hearing_scheduled' && d.hearing_date && (
                              <div style={{ fontSize:12, color:'var(--ink-faint)', marginTop:4 }}>
                                📅 {formatDate(d.hearing_date)}
                              </div>
                            )}
                          </td>
                          <td>
                            {['submitted','under_review'].includes(d.status) && (
                              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => setOpenInline((p) => (p?.key === rowKey && p?.action === 'schedule') ? null : { key: rowKey, action:'schedule' })}
                                >
                                  📅 Schedule
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => setOpenInline((p) => (p?.key === rowKey && p?.action === 'notes') ? null : { key: rowKey, action:'notes' })}
                                  style={{ color:'var(--forest)' }}
                                >
                                  📝 Notes
                                </button>
                              </div>
                            )}
                            {d.status === 'hearing_scheduled' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => setOpenInline((p) => (p?.key === rowKey && p?.action === 'resolve') ? null : { key: rowKey, action:'resolve' })}
                              >
                                ✅ Resolve
                              </button>
                            )}
                            {['resolved','closed'].includes(d.status) && (
                              <div style={{ fontSize:12, color:'var(--ink-light)' }}>
                                {truncate(d.resolution_notes || d.resolution || d.admin_notes, 60) || '—'}
                                {(d.resolution_notes || d.resolution || d.admin_notes) && String(d.resolution_notes || d.resolution || d.admin_notes).length > 60 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    style={{ padding:'2px 6px', fontSize:12, color:'var(--forest)' }}
                                    onClick={() => setOpenInline((p) => (p?.key === rowKey && p?.action === 'see_more') ? null : { key: rowKey, action:'see_more' })}
                                  >
                                    See more
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {showSchedule && (
                          <tr>
                            <td colSpan={7} style={{ background:'var(--cream)' }}>
                              <InlineDisputeSchedule
                                dispute={d}
                                onCancel={() => setOpenInline(null)}
                                onSuccess={async (msg) => {
                                  setOpenInline(null);
                                  toast.success(msg.replace(/^✅\s*/, ''));
                                  await fetchDisputes({ page:1, limit:50 });
                                }}
                              />
                            </td>
                          </tr>
                        )}

                        {showNotes && (
                          <tr>
                            <td colSpan={7} style={{ background:'var(--cream)' }}>
                              <InlineDisputeNotes
                                dispute={d}
                                onCancel={() => setOpenInline(null)}
                                onSuccess={async (msg) => {
                                  setOpenInline(null);
                                  toast.success(msg.replace(/^✅\s*/, ''));
                                  await fetchDisputes({ page:1, limit:50 });
                                }}
                              />
                            </td>
                          </tr>
                        )}

                        {showResolve && (
                          <tr>
                            <td colSpan={7} style={{ background:'var(--cream)' }}>
                              <InlineDisputeResolve
                                dispute={d}
                                onCancel={() => setOpenInline(null)}
                                onSuccess={async (msg) => {
                                  setOpenInline(null);
                                  toast.success(msg.replace(/^✅\s*/, ''));
                                  await fetchDisputes({ page:1, limit:50 });
                                }}
                              />
                            </td>
                          </tr>
                        )}

                        {showSeeMore && (
                          <tr>
                            <td colSpan={7} style={{ background:'var(--cream)' }}>
                              <div style={{ background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:14 }}>
                                <div style={{ fontWeight:700, fontSize:13, marginBottom:8, color:'var(--ink-mid)' }}>Resolution / Notes</div>
                                <div style={{ fontSize:13, color:'var(--ink-mid)', whiteSpace:'pre-wrap' }}>
                                  {d.resolution_notes || d.resolution || d.admin_notes}
                                </div>
                                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setOpenInline(null)}>Close</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Security Reports ── */}
        {activeSection === 'security' && (
          <SecurityPanel
            security={security}
            loading={securityLoading}
            error={securityErr}
            onRetry={() => fetchSecurity({ page:1, limit:50 })}
            openInline={openInline}
            setOpenInline={setOpenInline}
            onUpdated={async (msg) => {
              setOpenInline(null);
              toast.success(msg.replace(/^✅\s*/, ''));
              await fetchSecurity({ page:1, limit:50 });
            }}
          />
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize:17 }}>Reject Letter Request</h3>
              <button onClick={() => setRejectModal(null)} style={{ background:'var(--cream)', border:'none', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:14 }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:14, color:'var(--ink-mid)', marginBottom:12 }}>
                Rejecting <strong>{rejectModal.id}</strong> — {rejectModal.type} for <strong>{rejectModal.citizen}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea className="form-input form-textarea" value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this request is being rejected — the citizen will receive this via SMS…"
                  style={{ minHeight:90 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRejectSubmit} disabled={!rejectReason.trim()}>
                ❌ Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineDisputeSchedule({ dispute, onCancel, onSuccess }) {
  const [form, setForm] = useState({
    hearing_date: '',
    hearing_venue: 'Jimo East DO Grounds',
    hearing_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!form.hearing_date) {
      setError('Please select a hearing date.');
      return;
    }
    setLoading(true);
    try {
      await disputesApi.scheduleHearing(dispute._mongoId, {
        hearing_date: form.hearing_date,
        hearing_venue: form.hearing_venue,
        hearing_notes: form.hearing_notes?.trim() || undefined,
      });
      onSuccess(`✅ Hearing scheduled for ${dispute.ref_number || dispute.id}.`);
    } catch (e) {
      setError(e.message || 'Scheduling failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:14 }}>
      {error && <div className="alert alert-error" style={{ marginBottom:12 }}><span>⚠️</span><span>{error}</span></div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label className="form-label">Hearing Date *</label>
          <input className="form-input" type="date" value={form.hearing_date}
            onChange={e => setForm(f => ({ ...f, hearing_date: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label className="form-label">Hearing Venue</label>
          <input className="form-input" value={form.hearing_venue}
            onChange={e => setForm(f => ({ ...f, hearing_venue: e.target.value }))} />
        </div>
      </div>
      <div className="form-group" style={{ marginTop:12, marginBottom:0 }}>
        <label className="form-label">Hearing Notes (optional)</label>
        <textarea className="form-input form-textarea" style={{ minHeight:80 }}
          value={form.hearing_notes}
          onChange={e => setForm(f => ({ ...f, hearing_notes: e.target.value }))} />
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
          {loading ? '⏳ Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function InlineDisputeNotes({ dispute, onCancel, onSuccess }) {
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!adminNotes.trim()) {
      setError('Please enter notes.');
      return;
    }
    setLoading(true);
    try {
      await disputesApi.update(dispute._mongoId, { admin_notes: adminNotes.trim() });
      onSuccess(`✅ Notes saved for ${dispute.ref_number || dispute.id}.`);
    } catch (e) {
      setError(e.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:14 }}>
      {error && <div className="alert alert-error" style={{ marginBottom:12 }}><span>⚠️</span><span>{error}</span></div>}
      <div className="form-group" style={{ marginBottom:0 }}>
        <label className="form-label">Admin Notes</label>
        <textarea className="form-input form-textarea" style={{ minHeight:90 }}
          value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
          {loading ? '⏳ Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function InlineDisputeResolve({ dispute, onCancel, onSuccess }) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (resolutionNotes.trim().length < 10) {
      setError('Resolution notes must be at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      await disputesApi.resolve(dispute._mongoId, { resolution_notes: resolutionNotes.trim() });
      onSuccess(`✅ Dispute ${dispute.ref_number || dispute.id} marked as resolved.`);
    } catch (e) {
      setError(e.message || 'Resolve failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:14 }}>
      {error && <div className="alert alert-error" style={{ marginBottom:12 }}><span>⚠️</span><span>{error}</span></div>}
      <div className="form-group" style={{ marginBottom:0 }}>
        <label className="form-label">Resolution Notes *</label>
        <textarea className="form-input form-textarea" style={{ minHeight:90 }}
          value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} />
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
          {loading ? '⏳ Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

function SecurityPanel({ security, loading, error, onRetry, openInline, setOpenInline, onUpdated }) {
  const [urgFilter, setUrgFilter] = useState('all');

  const urgentNeeds = security.filter((s) =>
    ['urgent','high'].includes(String(s.urgency || '').toLowerCase()) && String(s.status || '').toLowerCase() !== 'resolved'
  );

  const filtered = urgFilter === 'all'
    ? security
    : security.filter((s) => String(s.urgency || '').toLowerCase() === urgFilter);

  const borderFor = (u) => {
    const x = String(u || '').toLowerCase();
    if (x === 'urgent') return 'var(--red)';
    if (x === 'high') return 'var(--amber)';
    if (x === 'medium') return 'var(--gold)';
    return 'var(--forest)';
  };

  const badgeForUrgency = (u) => {
    const x = String(u || '').toLowerCase();
    if (x === 'urgent') return 'badge-red';
    if (x === 'high') return 'badge-amber';
    if (x === 'medium') return 'badge-gold';
    return 'badge-green';
  };

  return (
    <div className="animate-fade">
      <h2 style={{ fontSize:20, marginBottom:16 }}>🚨 Security Reports</h2>

      {urgentNeeds.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom:12 }}>
          <span>⚠</span>
          <span><strong>{urgentNeeds.length}</strong> urgent report(s) require immediate attention</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom:12, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
          <span>⚠️</span><span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={onRetry}>Retry</button>
        </div>
      )}

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {[
          { k:'all',    l:'All' },
          { k:'urgent', l:'Urgent' },
          { k:'high',   l:'High' },
          { k:'medium', l:'Medium' },
          { k:'low',    l:'Low' },
        ].map((b) => (
          <button
            key={b.k}
            type="button"
            className={`chip ${urgFilter === b.k ? 'selected' : ''}`}
            onClick={() => setUrgFilter(b.k)}
          >
            {b.l}
          </button>
        ))}
      </div>

      {loading && <p className="pulse" style={{ color:'var(--ink-faint)' }}>Loading security reports…</p>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🛡️</div>
          <div className="empty-title">No security reports</div>
          <div className="empty-sub">Security reports submitted through the portal will appear here.</div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {filtered.map((s) => {
          const key = s._mongoId || s.id;
          const isOpen = openInline?.key === key && openInline?.action === 'update_status';
          const isResolved = String(s.status || '').toLowerCase() === 'resolved';
          return (
            <div key={key} className="card" style={{ borderLeft:`4px solid ${borderFor(s.urgency)}` }}>
              <div className="card-body">
                <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    <span className={`badge ${badgeForUrgency(s.urgency)}`}>{String(s.urgency || 'low').toUpperCase()}</span>
                    <span className="badge badge-blue">{s.type || 'Report'}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div style={{ textAlign:'right', fontSize:12, color:'var(--ink-faint)' }}>
                    <div>{formatDate(s.created_at)}</div>
                    <div className="mono">{s.ref_number || s.id}</div>
                  </div>
                </div>

                <p style={{ marginTop:10, fontSize:13, color:'var(--ink-mid)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                  {s.description || '—'}
                </p>

                <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <span className="village-pill">{s.village || '—'}</span>
                  {s.anonymous === true && <span className="badge badge-gray">🔒 Anonymous</span>}
                </div>

                {!isResolved ? (
                  <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setOpenInline((p) => (p?.key === key && p?.action === 'update_status') ? null : { key, action:'update_status' })}
                    >
                      📋 Update Status
                    </button>
                    <a className="btn btn-sm btn-ghost" href="tel:999" style={{ color:'var(--forest)' }}>
                      📞 Coordinate
                    </a>
                  </div>
                ) : (
                  <div style={{ marginTop:12 }}>
                    <span className="badge badge-green">✅ Resolved</span>
                    {s.response_notes && (
                      <div style={{ marginTop:10, background:'var(--cream)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, fontSize:13, color:'var(--ink-mid)', whiteSpace:'pre-wrap' }}>
                        {s.response_notes}
                      </div>
                    )}
                  </div>
                )}

                {isOpen && (
                  <InlineSecurityUpdate
                    report={s}
                    onCancel={() => setOpenInline(null)}
                    onSuccess={onUpdated}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlineSecurityUpdate({ report, onCancel, onSuccess }) {
  const [status, setStatus] = useState('under_review');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!status) return;
    setLoading(true);
    try {
      await securityApi.update(report._mongoId, {
        status,
        response_notes: notes.trim() || undefined,
      });
      onSuccess(`✅ Security report ${report.ref_number || report.id} updated.`);
    } catch (e) {
      setError(e.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop:12, background:'var(--cream)', borderRadius:'var(--radius-sm)', padding:14 }}>
      {error && <div className="alert alert-error" style={{ marginBottom:12 }}><span>⚠️</span><span>{error}</span></div>}
      <div className="form-group" style={{ marginBottom:12 }}>
        <label className="form-label">Status</label>
        <select className="form-input form-select" value={status} onChange={e => setStatus(e.target.value)}>
          {['under_review','escalated','resolved'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom:0 }}>
        <label className="form-label">Response Notes</label>
        <textarea className="form-input form-textarea" style={{ minHeight:80 }}
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
          {loading ? '⏳ Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

function VillageTable({ villagesRaw }) {
  const [sort, setSort] = useState({ col: 'letters', dir: 'desc' });

  const rows = (villagesRaw?.data || villagesRaw || []).map((v, idx) => ({
    _i: idx,
    village:  v.village,
    citizens: v.citizens || 0,
    letters:  v.letters || 0,
    approved: v.letters_approved || 0,
    disputes: v.disputes || 0,
    open:     v.disputes_open || 0,
    security: v.security || 0,
    urgent:   v.security_urgent || 0,
  }));

  const columns = [
    { key:'#', label:'#', val:(r) => r._i + 1 },
    { key:'village',  label:'Village',  val:(r) => r.village },
    { key:'citizens', label:'Citizens', val:(r) => r.citizens },
    { key:'letters',  label:'Letters',  val:(r) => r.letters },
    { key:'approved', label:'Approved', val:(r) => r.approved },
    { key:'disputes', label:'Disputes', val:(r) => r.disputes },
    { key:'open',     label:'Open',     val:(r) => r.open },
    { key:'security', label:'Security', val:(r) => r.security },
    { key:'urgent',   label:'Urgent',   val:(r) => r.urgent },
  ];

  const sorted = [...rows].sort((a, b) => {
    const col = sort.col;
    const av = col === '#' ? (a._i + 1) : a[col];
    const bv = col === '#' ? (b._i + 1) : b[col];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sort.dir === 'asc' ? (av - bv) : (bv - av);
    }
    const as = String(av || '').toLowerCase();
    const bs = String(bv || '').toLowerCase();
    if (as === bs) return 0;
    return sort.dir === 'asc' ? (as < bs ? -1 : 1) : (as > bs ? -1 : 1);
  });

  const toggleSort = (col) => {
    setSort((s) => {
      if (s.col === col) return { col, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { col, dir: 'desc' };
    });
  };

  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop:18 }}>
      <h3 style={{ fontSize:15, fontWeight:700, marginBottom:10, color:'var(--ink-mid)' }}>All Villages (Sortable)</h3>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ cursor: c.key === '#' ? 'default' : 'pointer' }}
                  onClick={() => c.key !== '#' && toggleSort(c.key)}
                >
                  {c.label}
                  {sort.col === c.key && <span style={{ marginLeft:6 }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.village || r._i}>
                <td className="mono" style={{ fontSize:12 }}>{r._i + 1}</td>
                <td style={{ fontWeight:600 }}>{r.village}</td>
                <td>{r.citizens}</td>
                <td>{r.letters}</td>
                <td>{r.approved}</td>
                <td>{r.disputes}</td>
                <td>{r.open}</td>
                <td>{r.security}</td>
                <td>{r.urgent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

