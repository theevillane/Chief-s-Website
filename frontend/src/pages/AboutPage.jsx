// ─── AboutPage.jsx ────────────────────────────────────────────────────────────
const VILLAGES=['Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo','Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka','Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira','Kogol','Kabuor Omuga'];

export function AboutPage({ setPage }) {
  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <h2>About Jimo East Chief's Office</h2>
        <p>The administrative hub for 20 villages under the NGAO structure</p>
      </div>
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-body">
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ width:72,height:72,borderRadius:'50%',background:'var(--forest)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gold)',fontSize:28,fontWeight:800,flexShrink:0 }}>JO</div>
            <div>
              <h3 style={{ fontSize:18, fontFamily:"'DM Sans',sans-serif" }}>Chief John Otieno Otieno</h3>
              <div style={{ color:'var(--ink-light)', fontSize:13 }}>Chief, Jimo East Location · NGAO</div>
              <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                <span className="badge badge-green">Active</span>
                <span className="badge badge-gold">Certified NGAO Officer</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize:14, color:'var(--ink-mid)', lineHeight:1.8 }}>
            The Chief's office is the primary link between citizens and the national government at the grassroots level. Under Kenya's National Government Administration Officers (NGAO) structure, the Chief of Jimo East Location is responsible for maintaining peace, resolving disputes, facilitating government programs, and ensuring service delivery to all 20 villages.
          </p>
        </div>
      </div>
      <h3 style={{ fontSize:18, marginBottom:12 }}>The 20 Villages of Jimo East</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8, marginBottom:24 }}>
        {VILLAGES.map((v,i) => (
          <div key={v} style={{ background:'white', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 14px', display:'flex', gap:8, alignItems:'center', fontSize:13 }}>
            <span style={{ color:'var(--ink-faint)', fontSize:11, width:18 }}>{i+1}.</span>
            <span style={{ fontWeight:500 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign:'center' }}>
        <button className="btn btn-primary btn-lg" onClick={() => setPage('register')}>📱 Register to Access Services</button>
      </div>
    </div>
  );
}
export default AboutPage;
