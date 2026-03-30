// ─── SiteFooter.jsx ───────────────────────────────────────────────────────────
const VILLAGES=['Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo','Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka','Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira','Kogol','Kabuor Omuga'];

export function SiteFooter({ setPage }) {
  return (
    <footer style={{ background:'var(--forest)', color:'rgba(255,255,255,0.75)', marginTop:48 }}>
      <div style={{ background:'var(--forest-mid)', padding:'32px 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:36 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:40,height:40,background:'var(--gold)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'var(--forest)',flexShrink:0 }}>JE</div>
              <div>
                <div style={{ color:'white',fontWeight:700,fontSize:14,lineHeight:1.2 }}>Jimo East</div>
                <div style={{ color:'rgba(255,255,255,0.55)',fontSize:11 }}>Chief Digital Services Portal</div>
              </div>
            </div>
            <p style={{ fontSize:12,lineHeight:1.8,color:'rgba(255,255,255,0.6)',marginBottom:14 }}>Serving 20 villages of Jimo East Location under NGAO — Republic of Kenya.</p>
            <span className="badge" style={{ background:'rgba(212,160,23,0.2)',color:'var(--gold-light)',border:'1px solid rgba(212,160,23,0.3)',fontSize:11 }}>🇰🇪 Republic of Kenya</span>
          </div>
          <div>
            <div style={{ color:'white',fontWeight:700,fontSize:13,marginBottom:14,textTransform:'uppercase',letterSpacing:'0.06em' }}>Our Services</div>
            {[['📄','Request Letter','request_letter'],['⚖️','Report Dispute','report_dispute'],['🚨','Security Issue','report_security'],['🚫','Illicit Activity','report_illicit'],['📢','Announcements','announcements']].map(([icon,label,key]) => (
              <div key={key} onClick={() => setPage(key)} style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,color:'rgba(255,255,255,0.65)',marginBottom:8,cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.65)'}>
                <span style={{ fontSize:14 }}>{icon}</span>{label}
              </div>
            ))}
          </div>
          <div>
            <div style={{ color:'white',fontWeight:700,fontSize:13,marginBottom:14,textTransform:'uppercase',letterSpacing:'0.06em' }}>Quick Contact</div>
            {['👤 Chief John Otieno Otieno','📍 Onyuongo Office','📞 0726 299887','📧 jimoeast@ngao.go.ke','🕐 Mon–Fri, 8:00 AM – 5:00 PM'].map((c,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:9,lineHeight:1.4 }}>
                <span>{c.split(' ')[0]}</span><span>{c.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ color:'white',fontWeight:700,fontSize:13,marginBottom:14,textTransform:'uppercase',letterSpacing:'0.06em' }}>Emergency</div>
            {[['🚔','Kenya Police','999'],['🚑','Ambulance','999'],['👩‍⚕️','GBV Hotline','1195'],['👶','Child Helpline','116']].map(([icon,label,num],i)=>(
              <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,marginBottom:8,padding:'6px 10px',background:'rgba(0,0,0,0.15)',borderRadius:6 }}>
                <span style={{ color:'rgba(255,255,255,0.65)' }}>{icon} {label}</span>
                <span style={{ color:'var(--gold-light)',fontWeight:700,fontFamily:"'DM Mono',monospace" }}>{num}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', padding:'16px 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.08em' }}>📍 20 Villages of Jimo East Location</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {VILLAGES.map(v => <span key={v} style={{ fontSize:11,color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.06)',padding:'3px 10px',borderRadius:20,border:'1px solid rgba(255,255,255,0.1)' }}>{v}</span>)}
          </div>
        </div>
      </div>

      <div style={{ padding:'20px 40px' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16 }}>
          <div style={{ fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.6 }}>
            <div>© {new Date().getFullYear()} Office of the Chief, Jimo East Location · Republic of Kenya</div>
            <div style={{ marginTop:2 }}>Powered by Kenya GovTech Initiative · NGAO Digital Services</div>
          </div>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            {[['🔒','Privacy Policy'],['📋','Terms of Use'],['📞','Contact'],['❓','Help & FAQ']].map(([icon,label])=>(
              <button key={label} style={{ background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.65)',padding:'6px 14px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.15)';e.currentTarget.style.color='white';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='rgba(255,255,255,0.65)';}}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth:1100,margin:'12px auto 0',paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.07)',fontSize:11,color:'rgba(255,255,255,0.3)',textAlign:'center' }}>
          This is an official digital service of the Kenya National Government. Data is protected under the Kenya Data Protection Act, 2019.
        </div>
      </div>
    </footer>
  );
}
export default SiteFooter;
