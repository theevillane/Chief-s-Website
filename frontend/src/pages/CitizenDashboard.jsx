import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { letters as lettersApi } from '../services/api';
import { normLetterList, timeAgo } from '../utils/formatters';

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

export default function CitizenDashboard({ user, setPage }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearch]   = useState('');

  const { loading, error, data: lettersRaw, execute: fetchLetters } = useApi(lettersApi.list);
  const [downloadBusy, setDownloadBusy] = useState(null);
  const [downloadErr, setDownloadErr] = useState('');

  const fetchMyLetters = useCallback(() => fetchLetters({ page: 1, limit: 50 }), [fetchLetters]);

  useEffect(() => { fetchMyLetters(); }, [fetchMyLetters]);

  const allLetters = normLetterList(lettersRaw?.data || lettersRaw || []);
  const myLetters  = searchTerm
    ? allLetters.filter(r =>
        r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allLetters;

  const stats = {
    total:    myLetters.length,
    approved: myLetters.filter(r => r.status === 'approved').length,
    pending:  myLetters.filter(r => r.status === 'under_review').length,
    submitted: myLetters.filter(r => r.status === 'submitted').length,
  };

  const handleDownload = async (letter) => {
    if (!letter._mongoId) return;
    setDownloadErr('');
    setDownloadBusy(letter.id);
    try {
      const { blob, filename } = await lettersApi.downloadFile(letter._mongoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${letter.id || 'letter'}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadErr(e.message || 'Download failed.');
    } finally {
      setDownloadBusy(null);
    }
  };

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }} className="animate-fade">

      {/* Profile header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
          <div className="avatar avatar-lg" style={{ background:'var(--forest-pale)', color:'var(--forest)' }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize:22 }}>{user?.name}</h2>
            <div style={{ fontSize:13, color:'var(--ink-light)', display:'flex', gap:10, flexWrap:'wrap' }}>
              <span>📍 {user?.village || 'Jimo East'}</span>
              {user?.id_number && <span>🪪 ID: {user.id_number}</span>}
              <span className="badge badge-green">✅ Verified</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setPage('request_letter')}>+ New Request</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[{key:'overview',l:'Overview'},{key:'requests',l:'My Requests'},{key:'history',l:'Activity'}].map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>{t.l}</button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="animate-fade">
          <div className="stats-grid" style={{ marginBottom:24 }}>
            {[
              { n:stats.total,     l:'Total Requests', c:'var(--forest)' },
              { n:stats.approved,  l:'Approved',       c:'#2ECC71' },
              { n:stats.pending,   l:'Under Review',   c:'var(--amber)' },
              { n:stats.submitted, l:'Awaiting Review',c:'var(--blue)' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-num" style={{ color:s.c }}>{s.n}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>

          {loading && <p style={{ color:'var(--ink-faint)', textAlign:'center' }}>Loading your requests…</p>}
          {error   && (
            <div className="alert alert-error" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12 }}>
              <span>⚠️</span><span>{error}</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchMyLetters()}>Retry</button>
            </div>
          )}
          {downloadErr && <div className="alert alert-error" style={{ marginTop:12 }}><span>⚠️</span><span>{downloadErr}</span></div>}

          <h3 style={{ fontSize:16, marginBottom:12, fontWeight:700 }}>Recent Requests</h3>
          {myLetters.slice(0, 4).map(r => (
            <div key={r.id} className="card" style={{ marginBottom:10 }}>
              <div className="card-body" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {r.type?.includes('Letter') ? '📄' : r.type?.includes('Dispute') ? '⚖️' : '🔒'}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{r.type}</div>
                    <div style={{ fontSize:12, color:'var(--ink-faint)' }}>
                      <span className="ref-num" style={{ padding:'2px 8px', fontSize:11 }}>{r.id}</span>
                      {' · '}{r.date}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <StatusBadge status={r.status} />
                  {r.status === 'approved' && (
                    <button className="btn btn-sm btn-outline" style={{ fontSize:12 }}
                      onClick={() => handleDownload(r)}
                      disabled={downloadBusy === r.id}>
                      {downloadBusy === r.id ? '⏳…' : '⬇️ Download'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {myLetters.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <div className="empty-title">No requests yet</div>
              <div className="empty-sub">Submit your first service request to get started.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:12 }} onClick={() => setPage('request_letter')}>
                + Request a Letter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Requests tab ── */}
      {activeTab === 'requests' && (
        <div className="animate-fade">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div className="search-bar" style={{ flex:1, maxWidth:320 }}>
              <span>🔍</span>
              <input placeholder="Search by type or reference…"
                value={searchTerm} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('request_letter')}>+ New</button>
          </div>
          {loading && <p style={{ color:'var(--ink-faint)' }}>Loading…</p>}
          {error   && (
            <div className="alert alert-error" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12 }}>
              <span>⚠️</span><span>{error}</span>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchMyLetters()}>Retry</button>
            </div>
          )}
          {downloadErr && <div className="alert alert-error"><span>⚠️</span><span>{downloadErr}</span></div>}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Ref No.</th><th>Service</th><th>Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {myLetters.map(r => (
                  <tr key={r.id}>
                    <td><span className="ref-num" style={{ padding:'2px 8px', fontSize:11 }}>{r.id}</span></td>
                    <td style={{ fontWeight:500 }}>{r.type}</td>
                    <td style={{ color:'var(--ink-light)' }}>{r.date}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.status === 'approved'
                        ? <button className="btn btn-sm btn-outline" style={{ fontSize:12 }}
                            onClick={() => handleDownload(r)}
                            disabled={downloadBusy === r.id}>
                            {downloadBusy === r.id ? '⏳…' : '⬇️ Download'}
                          </button>
                        : <span style={{ fontSize:12, color:'var(--ink-faint)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Activity tab ── */}
      {activeTab === 'history' && (
        <div className="animate-fade">
          <div className="timeline">
            {myLetters.slice(0, 8).map((r, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-time">{r.date}</div>
                <div className="timeline-text">{r.type} — <StatusBadge status={r.status} /></div>
              </div>
            ))}
            {myLetters.length === 0 && !loading && (
              <p style={{ color:'var(--ink-faint)', fontSize:14 }}>No activity yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
