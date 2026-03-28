// ─── RequestLetterPage.jsx ───────────────────────────────────────────────────
import { useState } from 'react';
import { useSubmit } from '../hooks/useApi';
import { letters as lettersApi } from '../services/api';

const VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];
const LETTER_TYPES = [
  { id:'id_letter', label:'Identification Letter',       desc:'Confirm identity for official use',          icon:'🪪' },
  { id:'residence', label:'Residence Confirmation',      desc:'Proof of residence in the location',         icon:'🏠' },
  { id:'school',    label:'School Admission Letter',     desc:'Support application for school admission',   icon:'🎓' },
  { id:'conduct',   label:'Good Conduct / Character',    desc:'Certificate of good behaviour',              icon:'⭐' },
  { id:'intro_id',  label:'Introduction Letter (ID)',    desc:'For applying for National ID',               icon:'📄' },
];

export function RequestLetterPage({ user, setPage }) {
  const { submit, loading, error, success, resultData } = useSubmit(lettersApi.create);
  const adminRoles = ['admin', 'chief', 'assistant_chief'];
  const [step, setStep]       = useState(1);
  const [selected, setSelected] = useState(null);
  const [form, setForm]       = useState({ purpose:'', village: user?.village || '', destination:'' });

  if (!user) return (
    <div className="page-container">
      <div className="alert alert-warning">
        <span>⚠️</span>
        <span>Please sign in to request a letter.{' '}
          <button style={{ background:'none', border:'none', color:'var(--amber)', cursor:'pointer', fontWeight:600 }}
            onClick={() => setPage('login')}>Sign In</button>
        </span>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    const purpose = form.purpose.trim();
    if (purpose.length < 10 || purpose.length > 500) return;
    await submit({
      letter_type: selected,
      village:     form.village,
      purpose,
      destination: form.destination?.trim() || undefined,
    });
  };

  if (success) return (
    <div className="page-container animate-fade" style={{ textAlign:'center' }}>
      <div style={{ fontSize:64 }}>✅</div>
      <h2 style={{ marginTop:12 }}>Request Submitted!</h2>
      <p style={{ color:'var(--ink-light)', marginTop:8, marginBottom:20 }}>
        Your letter request has been received. You will be notified via SMS within 2–3 working days.
      </p>
      <div className="ref-num" style={{ display:'inline-block', marginBottom:20 }}>
        {resultData?.request?.ref_number || resultData?.ref_number || 'Ref assigned'}
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() =>
            setPage(user?.role && adminRoles.includes(user.role) ? 'admin' : 'dashboard')
          }>
          📊 Track My Request
        </button>
        <button className="btn btn-outline" onClick={() => { setStep(1); setSelected(null); }}>📄 Request Another</button>
      </div>
    </div>
  );

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <h2>Request Official Letter</h2>
        <p>Letters are issued by Chief John Otieno Otieno, Jimo East Location</p>
      </div>
      <div className="steps">
        {['Select Type','Your Details','Submit'].map((s, i) => (
          <div key={i} className={`step ${step > i+1 ? 'done' : step === i+1 ? 'active' : ''}`}>
            <div className="step-num">{step > i+1 ? '✓' : i+1}</div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span><span>{error}</span></div>}

      {step === 1 && (
        <div className="animate-fade">
          {LETTER_TYPES.map(lt => (
            <div key={lt.id} className="card" style={{ cursor:'pointer', marginBottom:10, border: selected === lt.id ? '2px solid var(--forest)' : '1px solid var(--border)', background: selected === lt.id ? 'var(--forest-pale)' : 'white' }}
              onClick={() => setSelected(lt.id)}>
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:28 }}>{lt.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:15 }}>{lt.label}</div>
                  <div style={{ fontSize:13, color:'var(--ink-light)' }}>{lt.desc}</div>
                </div>
                <div style={{ color: selected === lt.id ? 'var(--forest)' : 'var(--border)', fontSize:20 }}>
                  {selected === lt.id ? '✅' : '○'}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:16, textAlign:'right' }}>
            <button className="btn btn-primary" disabled={!selected} onClick={() => setStep(2)}>Continue →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card animate-fade">
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom:16 }}>
              <span>📄</span><span>Requesting: <strong>{LETTER_TYPES.find(l => l.id === selected)?.label}</strong></span>
            </div>
            <div className="form-group">
              <label className="form-label">Village *</label>
              <select className="form-input form-select" value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))}>
                <option value="">Select village</option>
                {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Purpose / Reason *</label>
              <textarea className="form-input form-textarea" value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Explain why you need this letter…" />
            </div>
            {selected === 'conduct' && (
              <div className="form-group">
                <label className="form-label">Destination Organisation</label>
                <input className="form-input" value={form.destination}
                  onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                  placeholder="e.g. KCA University, ABC Company" />
              </div>
            )}
            {form.purpose.trim().length > 0 && (form.purpose.trim().length < 10 || form.purpose.trim().length > 500) && (
              <p style={{ fontSize:12, color:'var(--red)', marginTop:8 }}>Purpose must be 10–500 characters.</p>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button
                className="btn btn-primary"
                disabled={
                  !form.purpose ||
                  !form.village ||
                  form.purpose.trim().length < 10 ||
                  form.purpose.trim().length > 500
                }
                onClick={() => setStep(3)}>
                Review →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade">
          <div className="alert alert-info" style={{ marginBottom:16 }}>
            <span>📋</span>
            <div>
              <strong>Review your request before submitting:</strong>
              <ul style={{ margin:'8px 0 0 16px', fontSize:13 }}>
                <li>Type: {LETTER_TYPES.find(l => l.id === selected)?.label}</li>
                <li>Village: {form.village}</li>
                <li>Purpose: {form.purpose}</li>
              </ul>
            </div>
          </div>
          <div className="alert alert-warning">
            <span>⚠️</span><span>The signed PDF will be available for download after Chief's approval (2–3 working days).</span>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>← Edit</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Submitting…' : '📤 Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default RequestLetterPage;
