import { useState, useEffect } from 'react';
import { useApi, useSubmit } from '../hooks/useApi';
import { admin as adminApi, letters as lettersApi, announcements as annApi } from '../services/api';
import { normLetterList, normVillageStats, buildKpis } from '../utils/formatters';

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
  const [actionMsg, setActionMsg]         = useState('');

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: statsRaw, execute: fetchStats, loading: statsLoading, error: statsError } = useApi(adminApi.stats);
  const { data: lettersRaw, execute: fetchLetters, loading: lettersLoad, error: lettersErr } = useApi(lettersApi.list);
  const { data: villagesRaw, execute: fetchVillages, loading: villagesLoading, error: villagesErr } = useApi(adminApi.villages);
  const { data: citizensRaw, execute: fetchCitizens, loading: citizensLoading, error: citizensErr } = useApi(adminApi.citizens);

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
  }, [activeSection]);

  const stats      = statsRaw?.data || statsRaw || {};
  const kpis       = buildKpis(stats);
  const trend      = stats.trend || [];
  const trendMax   = Math.max(...trend.map(d => d.count), 1);

  const allLetters = normLetterList(lettersRaw?.data || lettersRaw || []);
  const filtered   = statusFilter === 'all' ? allLetters : allLetters.filter(r => r.status === statusFilter);
  const villages   = normVillageStats(villagesRaw?.data || villagesRaw || []);
  const citizens   = (citizensRaw?.data || citizensRaw || []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async (letter) => {
    setActionMsg('');
    try {
      await lettersApi.approve(letter._mongoId, { admin_notes: 'Approved by chief' });
      setActionMsg(`✅ Letter ${letter.id} approved. PDF generated and SMS sent to citizen.`);
      fetchLetters({ page:1, limit:50 });
      fetchStats();
    } catch (err) {
      setActionMsg(`❌ Approval failed: ${err.message}`);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    try {
      await lettersApi.reject(rejectModal._mongoId, { rejection_reason: rejectReason });
      setActionMsg(`❌ Letter ${rejectModal.id} rejected. Citizen notified via SMS.`);
      setRejectModal(null);
      setRejectReason('');
      fetchLetters({ page:1, limit:50 });
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handlePublishAnn = async () => {
    const title = annForm.title.trim();
    const body  = annForm.body.trim();
    if (title.length < 5 || body.length < 10) return;
    const res = await publishAnn({ ...annForm, title, body });
    if (res?.success) {
      setAnnForm({ title:'', body:'', category:'baraza', target_villages:['all'], send_sms:false });
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

        {/* Shared action message banner */}
        {actionMsg && (
          <div className={`alert ${actionMsg.startsWith('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom:16 }}>
            <span>{actionMsg}</span>
            <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer' }} onClick={() => setActionMsg('')}>✕</button>
          </div>
        )}

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

        {/* Placeholder sections */}
        {['disputes','security'].includes(activeSection) && (
          <div className="animate-fade">
            <h2 style={{ fontSize:20, marginBottom:16 }}>
              {activeSection === 'disputes' ? '⚖️ Dispute Management' : '🚨 Security Reports'}
            </h2>
            <div className="alert alert-info">
              <span>ℹ️</span>
              <span>Full {activeSection} management UI — use the API endpoints directly at{' '}
                <code>/api/{activeSection}</code> or extend this section.</span>
            </div>
          </div>
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
