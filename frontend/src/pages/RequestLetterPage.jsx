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
          <div style={{ background:'white', maxWidth:600, margin:'0 auto', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:32, boxShadow:'var(--shadow-md)' }}>
            <div style={{ borderTop:'3px solid var(--forest)', borderBottom:'3px double var(--forest)', paddingBottom:12, marginBottom:12, display:'flex', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:15, color:'var(--forest)' }}>REPUBLIC OF KENYA</div>
                <div style={{ fontSize:13, fontWeight:700 }}>OFFICE OF THE CHIEF</div>
                <div style={{ fontSize:12, color:'var(--ink-light)' }}>Jimo East Location</div>
              </div>
              <div style={{ width:64, height:64, border:'3px solid var(--forest)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', fontSize:8, fontWeight:700, color:'var(--forest)', lineHeight:1.2 }}>
                CHIEF<br />JIMO EAST<br />LOCATION
              </div>
            </div>
            <div style={{ textAlign:'right', fontSize:12, marginBottom:4 }}>Ref: [Will be assigned on submission]</div>
            <div style={{ textAlign:'right', fontSize:12, marginBottom:14 }}>{new Date().toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}</div>
            <div style={{ textAlign:'center', color:'var(--forest)', fontWeight:700, textTransform:'uppercase', textDecoration:'underline', marginBottom:14 }}>
              {LETTER_TYPES.find(l => l.id === selected)?.label}
            </div>
            <p style={{ marginBottom:10 }}>TO WHOM IT MAY CONCERN,</p>
            <p style={{ fontSize:14, color:'var(--ink-mid)', lineHeight:1.8 }}>
              {selected === 'id_letter' && `This is to certify that ${user?.name}, a resident of ${form.village} Village, Jimo East Location, is known to this office and their identity is confirmed for official use.`}
              {selected === 'residence' && `This is to confirm that ${user?.name} is a bona fide resident of ${form.village} Village, Jimo East Location.`}
              {selected === 'school' && `This is to support the school admission application of ${user?.name}, a resident of ${form.village} Village.`}
              {selected === 'conduct' && `This is to certify that ${user?.name} of ${form.village} Village is a person of good conduct and character as known to this office.`}
              {selected === 'intro_id' && `This letter introduces ${user?.name} of ${form.village} Village, applying for a Kenya National Identity Card for the first time.`}
            </p>
            <p style={{ marginTop:10, fontSize:14, color:'var(--ink-mid)' }}>
              This letter is issued for the purpose of: <strong>{form.purpose}</strong>
            </p>
            <div style={{ marginTop:24 }}>
              <div>Issued by:</div>
              <div style={{ width:180, borderBottom:'1px solid var(--ink)' }} />
              <div style={{ marginTop:6, fontWeight:700, color:'var(--forest)' }}>Chief John Otieno Otieno</div>
              <div>Chief, Jimo East Location</div>
              <div>{new Date().toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}</div>
              <div style={{ marginTop:8, fontStyle:'italic', color:'var(--ink-faint)', fontSize:12 }}>[Official Stamp & Digital Signature Applied on Approval]</div>
            </div>
          </div>
          <div className="alert alert-warning" style={{ marginTop:12 }}>
            <span>⚠️</span><span>This is a preview only. The final signed letter will be available for download after Chief's approval (2–3 working days).</span>
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
