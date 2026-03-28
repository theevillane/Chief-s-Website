import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { announcements as annApi } from '../services/api';
import { normAnnouncementList, displayTypeToCategory } from '../utils/formatters';

const FILTER_TABS = [
  { key:'all',      label:'All' },
  { key:'baraza',   label:'📢 Baraza' },
  { key:'security', label:'🚨 Security' },
  { key:'health',   label:'💊 Health' },
  { key:'gov',      label:'🏛 Government' },
  { key:'dev',      label:'🏗 Development' },
];

const TYPE_BADGE = {
  baraza:   'badge-green',
  security: 'badge-red',
  health:   'badge-blue',
  gov:      'badge-gold',
  dev:      'badge-amber',
  general:  'badge-gray',
  urgent:   'badge-red',
};

export default function AnnouncementsPage({ setPage }) {
  const [filter, setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);
  const { loading, error, data, execute } = useApi(annApi.list);

  // Fetch on mount and re-fetch when filter changes
  useEffect(() => {
    const params = {};
    if (filter !== 'all') params.category = displayTypeToCategory(filter);
    execute(params);
  }, [filter]);

  const announcements = normAnnouncementList(data?.data || data || []);

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'32px 24px' }} className="animate-fade">
      <div className="page-header">
        <h2>📢 Announcements</h2>
        <p>Official communications from Chief John Otieno Otieno · Jimo East Location</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {FILTER_TABS.map(t => (
          <button key={t.key} className={`btn btn-sm ${filter === t.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--ink-faint)' }}>
          <div style={{ fontSize:32, marginBottom:12 }} className="pulse">📢</div>
          <p>Loading announcements…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="alert alert-error" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12 }}>
          <span>⚠️</span><span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              const params = {};
              if (filter !== 'all') params.category = displayTypeToCategory(filter);
              execute(params);
            }}>
            Retry
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {announcements.map(ann => (
            <div key={ann.id} className="card" style={{ cursor:'pointer' }}
              onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}>
              <div className="card-body">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                      <span className={`badge ${TYPE_BADGE[ann.type] || 'badge-gray'}`}>
                        {ann.category || ann.type}
                      </span>
                      {ann.is_pinned && <span className="badge badge-gold">📌 Pinned</span>}
                      <span style={{ fontSize:12, color:'var(--ink-faint)' }}>📅 {ann.date}</span>
                    </div>
                    <h3 style={{ fontSize:16, fontFamily:"'DM Sans',sans-serif", fontWeight:700, color:'var(--ink)', marginBottom:6 }}>
                      {ann.title}
                    </h3>
                    <p style={{ fontSize:14, color:'var(--ink-mid)', lineHeight:1.6 }}>
                      {expanded === ann.id ? ann.body : (ann.body || '').substring(0, 120) + ((ann.body || '').length > 120 ? '…' : '')}
                    </p>
                    {expanded === ann.id && (
                      <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
                        <span className="village-pill">📍 {ann.village}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ color:'var(--ink-faint)', fontSize:14, flexShrink:0 }}>
                    {expanded === ann.id ? '▲' : '▼'}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {announcements.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📢</div>
              <div className="empty-title">No announcements</div>
              <div className="empty-sub">No announcements in this category yet.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
