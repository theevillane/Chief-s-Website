// ─── ReportSecurityPage.jsx ──────────────────────────────────────────────────
import { useState } from 'react';
import { useSubmit } from '../hooks/useApi';
import { security as securityApi } from '../services/api';

const VILLAGES = ['Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo','Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka','Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira','Kogol','Kabuor Omuga'];
const SECURITY_TYPES = ['Theft','Violence','Suspicious Activity','Emergency','Livestock Theft','Other'];

export function ReportSecurityPage({ setPage }) {
  const [form, setForm] = useState({
    type: '',
    urgency: '',
    description: '',
    village: '',
    location_detail: '',
    anonymous: true,
  });
  const [files, setFiles] = useState([]);

  const { submit, loading, error, success } = useSubmit((payload) => {
    const fd = new FormData();
    fd.append('type', payload.type);
    fd.append('urgency', payload.urgency);
    fd.append('description', payload.description);
    fd.append('village', payload.village);
    if (payload.location_detail) fd.append('location_detail', payload.location_detail);
    fd.append('anonymous', String(!!payload.anonymous));
    (payload._files || []).slice(0, 5).forEach((f) => fd.append('evidence', f));
    return securityApi.create(fd, { skipAuth: !!payload.anonymous });
  });

  if (success) return (
    <div className="page-container animate-fade" style={{ textAlign:'center' }}>
      <div style={{ fontSize:64 }}>🚨</div>
      <h2 style={{ marginTop:12 }}>Report Received</h2>
      <p style={{ color:'var(--ink-light)', marginTop:8 }}>
        {form.urgency === 'urgent' ? 'URGENT: Security officials have been alerted immediately.' : 'Your report is under review.'}
      </p>
      <div style={{ marginTop:24, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <button type="button" className="btn btn-danger" onClick={() => window.location.href='tel:999'}>📞 Call 999</button>
        <button type="button" className="btn btn-outline" onClick={() => setPage('home')}>Back to Home</button>
      </div>
    </div>
  );

  const clientErrors = [];
  if (form.description && form.description.trim().length < 15) {
    clientErrors.push('Description must be at least 15 characters.');
  }

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <div style={{ background:'var(--red-pale)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:12, display:'flex', gap:8, alignItems:'center' }}>
          <span>🚨</span><span style={{ fontSize:14, color:'var(--red)', fontWeight:600 }}>For life-threatening emergencies, call <strong>999</strong> immediately</span>
        </div>
        <h2>🚨 Report Security Issue</h2>
        <p>Report theft, violence, suspicious activity or emergencies to the Chief's office</p>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span><span>{error}</span></div>}
      {clientErrors.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span><span>{clientErrors[0]}</span></div>
      )}
      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Type of Incident *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 }}>
              {SECURITY_TYPES.map(t => (
                <div key={t} className={`chip ${form.type===t?'selected':''}`} onClick={() => setForm(f=>({...f,type:t}))}>{t}</div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Urgency Level *</label>
            <div className="urgency-grid">
              {[
                { key:'low',    icon:'🟢', label:'Low' },
                { key:'medium', icon:'🟡', label:'Medium' },
                { key:'high',   icon:'🟠', label:'High' },
                { key:'urgent', icon:'🔴', label:'Urgent / Emergency' },
              ].map(u => (
                <div key={u.key} className={`urgency-card ${form.urgency===u.key?`selected-${u.key}`:''}`} onClick={() => setForm(f=>({...f,urgency:u.key}))}>
                  <div className="urgency-icon">{u.icon}</div>
                  <div className="urgency-label">{u.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Village *</label>
            <select className="form-input form-select" value={form.village} onChange={e => setForm(f=>({...f,village:e.target.value}))}>
              <option value="">Select village</option>
              {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Location / landmark (optional)</label>
            <input className="form-input" value={form.location_detail} onChange={e => setForm(f=>({...f,location_detail:e.target.value}))} placeholder="e.g. Near Kowala market" />
          </div>
          <div className="form-group">
            <label className="form-label">Incident Description *</label>
            <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Describe what happened: who, what, when, where…" style={{ minHeight:120 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Photos / documents (optional, up to 5)</label>
            <input
              type="file"
              className="form-input"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
            />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--cream)', borderRadius:'var(--radius-sm)', marginBottom:16 }}>
            <input type="checkbox" checked={form.anonymous} onChange={e => setForm(f=>({...f,anonymous:e.target.checked}))} style={{ width:18, height:18, accentColor:'var(--forest)' }} />
            <label style={{ fontSize:14, cursor:'pointer' }}>Submit anonymously (your account will not be linked to this report)</label>
          </div>
          <button
            type="button"
            className={`btn btn-full btn-lg ${form.urgency==='urgent'||form.urgency==='high'?'btn-danger':'btn-primary'}`}
            onClick={() => submit({ ...form, _files: files })}
            disabled={loading || !form.type || !form.description || form.description.trim().length < 15 || !form.urgency || !form.village}>
            {loading ? '⏳ Reporting…' : form.urgency==='urgent' ? '🚨 URGENT REPORT' : '📤 Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
export default ReportSecurityPage;
