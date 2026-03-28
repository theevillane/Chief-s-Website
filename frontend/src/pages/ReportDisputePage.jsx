// ─── ReportDisputePage.jsx ───────────────────────────────────────────────────
import { useState } from 'react';
import { useSubmit } from '../hooks/useApi';
import { disputes as disputesApi } from '../services/api';

const VILLAGES = ['Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo','Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka','Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira','Kogol','Kabuor Omuga'];
const DISPUTE_TYPES = ['Land Boundary','Family Conflict','Inheritance','Neighbor Dispute','Water Rights','Other'];

export function ReportDisputePage({ user, setPage }) {
  const [form, setForm] = useState({
    type: '',
    description: '',
    parties: '',
    village: user?.village || '',
    location_description: '',
    anonymous: false,
  });
  const [files, setFiles] = useState([]);

  const { submit, loading, error, success, resultData } = useSubmit((payload) => {
    if (!payload.anonymous && !user) {
      throw new Error('Please sign in to submit a dispute with your name, or check "Submit anonymously".');
    }
    const fd = new FormData();
    fd.append('type', String(payload.type));
    fd.append('description', String(payload.description));
    fd.append('parties', String(payload.parties));
    fd.append('village', String(payload.village));
    if (payload.location_description) fd.append('location_description', String(payload.location_description));
    fd.append('anonymous', String(!!payload.anonymous));
    (payload._files || []).slice(0, 5).forEach((f) => fd.append('evidence', f));
    return disputesApi.create(fd, { skipAuth: !!payload.anonymous });
  });

  if (success) return (
    <div className="page-container animate-fade" style={{ textAlign:'center' }}>
      <div style={{ fontSize:64 }}>⚖️</div>
      <h2 style={{ marginTop:12 }}>Dispute Reported</h2>
      <p style={{ color:'var(--ink-light)', marginTop:8, marginBottom:20 }}>
        Your dispute has been submitted. The Chief's office will schedule a hearing within 5–7 working days.
      </p>
      <div className="ref-num" style={{ display:'inline-block', marginBottom:20 }}>{resultData?.dispute?.ref_number || resultData?.ref_number}</div>
      <button type="button" className="btn btn-primary" onClick={() => setPage(user ? 'dashboard' : 'home')}>
        {user ? 'Track My Case →' : 'Back to Home'}
      </button>
    </div>
  );

  const partiesLen = form.parties.trim().length;
  const descLen    = form.description.trim().length;
  const clientErrs = [];
  if (partiesLen > 0 && partiesLen < 3) clientErrs.push('Parties field must be at least 3 characters.');
  if (descLen > 0 && descLen < 20) clientErrs.push('Description must be at least 20 characters.');

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <h2>⚖️ Report a Dispute</h2>
        <p>File a dispute for mediation by the Chief's office. All submissions are treated confidentially.</p>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span><span>{error}</span></div>}
      {clientErrs.map((m) => (
        <div key={m} className="alert alert-error" style={{ marginBottom:16 }}>
          <span>⚠️</span><span>{m}</span>
        </div>
      ))}
      <div className="card">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Type of Dispute *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 }}>
              {DISPUTE_TYPES.map(t => (
                <div key={t} className={`chip ${form.type===t ? 'selected' : ''}`} onClick={() => setForm(f=>({...f,type:t}))}>
                  {form.type===t && '✓ '}{t}
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
            <label className="form-label">Parties Involved *</label>
            <input className="form-input" value={form.parties} onChange={e => setForm(f=>({...f,parties:e.target.value}))} placeholder="Full names of all parties" />
          </div>
          <div className="form-group">
            <label className="form-label">Dispute Description *</label>
            <textarea className="form-input form-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the dispute in detail…" style={{ minHeight:120 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Location Description</label>
            <input className="form-input" value={form.location_description} onChange={e => setForm(f=>({...f,location_description:e.target.value}))} placeholder="e.g. Land near Kabuor river, northern boundary" />
          </div>
          <div className="form-group">
            <label className="form-label">Evidence photos / PDFs (optional, up to 5)</label>
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
            <label style={{ fontSize:14, cursor:'pointer' }}>Submit anonymously</label>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-full btn-lg"
            onClick={() => submit({ ...form, _files: files })}
            disabled={
              loading ||
              !form.type ||
              !form.description ||
              !form.parties ||
              !form.village ||
              partiesLen < 3 ||
              descLen < 20
            }>
            {loading ? '⏳ Submitting…' : '⚖️ Submit Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}
export default ReportDisputePage;
