// ─── ReportIllicitPage.jsx ────────────────────────────────────────────────────
import { useState } from 'react';
import { useSubmit } from '../hooks/useApi';
import { illicit as illicitApi } from '../services/api';

const VILLAGES=['Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo','Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka','Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira','Kogol','Kabuor Omuga'];
const ILLICIT_TYPES=['Illicit Alcohol Brewing','Drug Abuse','Criminal Activity','Gender-Based Violence','Rape / Defilement','Other'];

export function ReportIllicitPage({ setPage }) {
  const [form, setForm] = useState({ type:'', description:'', village:'', location_detail:'' });
  const [files, setFiles] = useState([]);

  const { submit, loading, error, success, resultData } = useSubmit((payload) => {
    const fd = new FormData();
    fd.append('type', String(payload.type));
    fd.append('description', String(payload.description));
    fd.append('village', String(payload.village));
    if (payload.location_detail) fd.append('location_detail', String(payload.location_detail));
    (payload._files || []).slice(0, 5).forEach((f) => fd.append('evidence', f));
    return illicitApi.create(fd, { skipAuth: true });
  });

  if (success) return (
    <div className="page-container animate-fade" style={{ textAlign:'center' }}>
      <div style={{ fontSize:64 }}>🚫</div>
      <h2 style={{ marginTop:12 }}>Report Submitted</h2>
      <p style={{ color:'var(--ink-light)', marginTop:8 }}>Your report is confidential. The administration will take appropriate action.</p>
      {resultData?.ref_number && <div className="ref-num" style={{ display:'inline-block', margin:'16px 0' }}>{resultData.ref_number}</div>}
      <br/>
      <button type="button" className="btn btn-primary" style={{ marginTop:8 }} onClick={() => setPage('home')}>Back to Home</button>
    </div>
  );

  const descLen = form.description.trim().length;
  const clientErr = descLen > 0 && descLen < 15 ? 'Description must be at least 15 characters.' : '';

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <h2>🚫 Illicit Activity Report</h2>
        <p>Report illicit brewing, drugs, GBV or criminal activity. Anonymous reporting available.</p>
      </div>
      <div className="alert alert-info" style={{ marginBottom:16 }}>
        <span>🔒</span><span><strong>Confidential:</strong> Reports are stored securely and reviewed only by authorised officials.</span>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span><span>{error}</span></div>}
      {clientErr && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span><span>{clientErr}</span></div>}
      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Type of Activity *</label>
            {ILLICIT_TYPES.map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginBottom:6, borderRadius:'var(--radius-sm)', border:`1.5px solid ${form.type===t?'var(--forest)':'var(--border)'}`, background:form.type===t?'var(--forest-pale)':'white', cursor:'pointer' }}
                onClick={() => setForm(f=>({...f,type:t}))}>
                <div style={{ width:18,height:18,borderRadius:'50%',border:`2px solid ${form.type===t?'var(--forest)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  {form.type===t && <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--forest)' }}/>}
                </div>
                <span style={{ fontSize:14, fontWeight:form.type===t?600:400 }}>{t}</span>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Village / Area *</label>
            <select className="form-input form-select" value={form.village} onChange={e => setForm(f=>({...f,village:e.target.value}))}>
              <option value="">Select village</option>
              {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Provide details: location, time, persons involved…" style={{ minHeight:120 }} />
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
          <div style={{ background:'var(--forest-pale)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
            <span>🔒</span>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--forest)' }}>Anonymous Mode is ON</div>
              <div style={{ fontSize:12, color:'var(--ink-light)' }}>Your identity will not be stored with this report</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-full btn-lg"
            onClick={() => submit({ ...form, _files: files })}
            disabled={loading || !form.type || !form.village || descLen < 15}>
            {loading ? '⏳ Submitting…' : '🔒 Submit Confidential Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
export default ReportIllicitPage;
