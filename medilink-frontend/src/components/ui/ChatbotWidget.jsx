import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const SUGGESTIONS = ['What are common cold symptoms?','How to lower blood pressure?','When should I see a doctor?','What is a normal heart rate?'];

export default function ChatbotWidget() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ id:1, role:'bot', text:`Hi ${user?.name?.split(' ')[0]||'there'}! I'm MediBot. Ask me any health questions.` }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs]);

  const RESPONSES = {
    'blood pressure':['Maintain a healthy diet low in sodium.','Exercise regularly, at least 30 min/day.','Avoid stress and get adequate sleep.','Consult your doctor if readings are consistently high.'],
    'cold':['Rest and stay hydrated.','Use saline nasal drops for congestion.','Take OTC medications for symptoms.','See a doctor if symptoms persist beyond 10 days.'],
    'heart rate':['A normal resting heart rate is 60-100 bpm.','Athletes may have a lower resting rate (40-60 bpm).','Factors like stress, caffeine, and illness can raise it.','Consult a cardiologist for persistent irregularities.'],
    'doctor':['Seek immediate care for chest pain, difficulty breathing, or signs of stroke.','See a doctor for fever above 103°F, persistent symptoms, or worsening conditions.','Schedule a routine check-up at least once a year.'],
    default:['That is a great health question. For accurate medical advice, please consult your doctor through the Consult section.','I can provide general health information, but your doctor knows your specific situation best.','Consider booking a consultation with one of our verified specialists for personalized advice.'],
  };

  const getResponse = (q) => {
    const lower = q.toLowerCase();
    for (const [k,v] of Object.entries(RESPONSES)) {
      if (k !== 'default' && lower.includes(k)) return v[Math.floor(Math.random()*v.length)];
    }
    return RESPONSES.default[Math.floor(Math.random()*RESPONSES.default.length)];
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');
    setMsgs(prev => [...prev, { id: Date.now(), role:'user', text: q }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 900 + Math.random()*600));
    setTyping(false);
    setMsgs(prev => [...prev, { id: Date.now()+1, role:'bot', text: getResponse(q) }]);
  };

  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{position:'fixed',bottom:24,right:24,width:52,height:52,borderRadius:'50%',background:'var(--primary)',color:'#fff',border:'none',cursor:'pointer',fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(14,164,114,0.4)',zIndex:1000,transition:'transform 0.2s'}}
        onMouseEnter={e=>e.target.style.transform='scale(1.1)'} onMouseLeave={e=>e.target.style.transform='scale(1)'}>
        {open?'✕':'💬'}
      </button>
      {open&&(
        <div style={{position:'fixed',bottom:88,right:24,width:320,height:440,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',display:'flex',flexDirection:'column',zIndex:1000,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',background:'var(--primary)',color:'#fff'}}>
            <div style={{fontWeight:700,fontSize:14}}>🤖 MediBot</div>
            <div style={{fontSize:11,opacity:0.85}}>Health Assistant · Always available</div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
            {msgs.map(m=>(
              <div key={m.id} style={{alignSelf:m.role==='user'?'flex-end':'flex-start',maxWidth:'85%'}}>
                <div style={{padding:'8px 12px',borderRadius:10,fontSize:12,lineHeight:1.5,background:m.role==='user'?'var(--primary)':'var(--surface-2)',color:m.role==='user'?'#fff':'var(--text)',borderBottomRightRadius:m.role==='user'?2:10,borderBottomLeftRadius:m.role==='bot'?2:10}}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing&&<div style={{alignSelf:'flex-start',background:'var(--surface-2)',padding:'8px 12px',borderRadius:10,fontSize:12,color:'var(--muted)'}}>Typing…</div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:'8px 8px',borderTop:'1px solid var(--border)',display:'flex',flexWrap:'wrap',gap:4}}>
            {SUGGESTIONS.slice(0,2).map(s=>(
              <button key={s} onClick={()=>send(s)} style={{fontSize:10,padding:'3px 8px',borderRadius:99,border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--muted)',cursor:'pointer',whiteSpace:'nowrap'}}>{s}</button>
            ))}
          </div>
          <div style={{padding:'0 8px 8px',display:'flex',gap:6}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask a health question…" style={{flex:1,padding:'8px 10px',border:'1px solid var(--border)',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'var(--surface-2)'}}/>
            <button onClick={()=>send()} style={{padding:'8px 12px',background:'var(--primary)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600}}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
