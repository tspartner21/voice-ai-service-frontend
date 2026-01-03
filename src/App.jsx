import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// --- Confetti Component (폭죽 효과) ---
function Confetti() {
    const colors = ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'];
    return (
        <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => (
                <div key={i} className="confetti-piece" style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${Math.random() * 2 + 3}s`
                }} />
            ))}
        </div>
    );
}

function App() {
    const [user, setUser] = useState(null);
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [view, setView] = useState('login');

    const refreshThemes = () => {
        fetch('http://localhost:8000/themes').then(r=>r.json()).then(setThemes).catch(console.error);
    };

    useEffect(() => { if (view === 'list') refreshThemes(); }, [view]);

    const handleLogin = (u) => { setUser(u); setView('list'); };
    const handleLogout = () => { setUser(null); setView('login'); setSelectedTheme(null); };

    return (
        <div className="container">
            {view === 'login' && <LoginScreen onLogin={handleLogin} />}

            {user && view === 'list' && (
                <ThemeList themes={themes} username={user.username}
                           onSelect={(id)=>{ const t = themes[id]; setSelectedTheme({...t, id}); setView(t.category === 'offline' ? 'detail' : 'chat'); }}
                           onMenu={(m)=>setView(m)} onLogout={handleLogout}
                />
            )}

            {user && view === 'report' && <ReportScreen username={user.username} onBack={()=>setView('list')} />}
            {user && view === 'bookings' && <BookingListScreen username={user.username} onBack={()=>setView('list')} />}

            {user && view === 'detail' && selectedTheme && <ProductDetail theme={selectedTheme} username={user.username} onBack={()=>setView('list')} />}
            {user && view === 'chat' && selectedTheme && <VoiceChat theme={selectedTheme} username={user.username} onBack={()=>setView('list')} />}
        </div>
    );
}

function LoginScreen({ onLogin }) {
    const [form, setForm] = useState({ username: '', password: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
            const data = await res.json();
            if(res.ok) onLogin(data); else alert("Login Failed");
        } catch { alert("Server Error"); }
    };
    return (
        <div className="screen login-screen">
            <div className="login-logo">Q</div>
            <div className="login-box">
                <h1>QUEST K</h1>
                <p>Tech-Driven Language Learning</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <input placeholder="ID (1111)" onChange={e=>setForm({...form, username:e.target.value})} />
                    <input type="password" placeholder="PW (1111)" onChange={e=>setForm({...form, password:e.target.value})} />
                    <button type="submit" className="btn-primary">START</button>
                </form>
            </div>
        </div>
    );
}

function ThemeList({ themes, username, onMenu, onSelect, onLogout }) {
    const [tab, setTab] = useState('basic');
    const list = Object.values(themes).filter(t => t.category === tab);
    return (
        <div className="screen">
            <div className="q-header">
                <div className="top-row">
                    <span>Hello, <b>{username}</b></span>
                    <div>
                        <button onClick={()=>onMenu('bookings')} className="btn-icon">📅</button>
                        <button onClick={()=>onMenu('report')} className="btn-icon">📊</button>
                        <button onClick={onLogout} className="btn-icon">🚪</button>
                    </div>
                </div>
                <h2>Select Quest</h2>
            </div>
            <div className="q-tabs">
                <button className={`tab ${tab==='basic'?'active':''}`} onClick={()=>setTab('basic')}>Online</button>
                <button className={`tab ${tab==='offline'?'active':''}`} onClick={()=>setTab('offline')}>Offline</button>
            </div>
            <div className="grid">
                {list.map(t => (
                    <div key={t.id} className="card" onClick={()=>onSelect(t.id)}>
                        <span className="icon">{t.icon}</span>
                        <div className="card-info"><h4>{t.title}</h4></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BookingListScreen({ username, onBack }) {
    const [list, setList] = useState([]);
    useEffect(() => { fetch(`http://localhost:8000/bookings/${username}`).then(r=>r.json()).then(setList); }, [username]);
    const cancel = async (id) => {
        if(confirm("Cancel?")) {
            await fetch('http://localhost:8000/bookings/cancel', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({booking_id: id}) });
            setList(list.filter(b => b.id !== id));
        }
    }
    return (
        <div className="screen">
            <div className="q-header"><button onClick={onBack}>←</button><h2>Bookings</h2></div>
            <ul className="log-list">
                {list.length===0?<p>No bookings</p>:list.map(b=><li key={b.id} className="log-item booking-item"><div><b>{b.theme_title}</b><span>{b.reserved_date}</span></div><button className="btn-cancel" onClick={()=>cancel(b.id)}>Cancel</button></li>)}
            </ul>
        </div>
    );
}

function ReportScreen({ username, onBack }) {
    const [logs, setLogs] = useState([]);
    useEffect(() => { fetch(`http://localhost:8000/reports/${username}`).then(r=>r.json()).then(setLogs); }, [username]);
    const graphData = [...logs].reverse();
    const fmt = (d) => new Date(d).toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul', month:'numeric', day:'numeric'});
    return (
        <div className="screen">
            <div className="q-header"><button onClick={onBack}>←</button><h2>Analysis</h2></div>
            <div className="chart-box">
                {graphData.map((l,i) => (<div key={i} className="bar-group"><div className="bar" style={{height: `${l.tech_score}%`}}></div><span className="bar-label">{l.tech_score}</span></div>))}
            </div>
            <ul className="log-list">
                {logs.map((l,i)=><li key={i} className="log-item"><div><b>{l.theme_id}</b><small>{fmt(l.created_at)}</small></div><div className="score">{l.tech_score}</div></li>)}
            </ul>
        </div>
    );
}

function ProductDetail({ theme, username, onBack }) {
    const [form, setForm] = useState({ date: '', people: 1 });
    const book = async () => {
        if(!form.date) return alert("Select Date");
        const res = await fetch('http://localhost:8000/book', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username, theme_id: theme.id, ...form}) });
        if(res.ok) { alert("Success"); onBack(); }
    };
    return (
        <div className="screen detail-screen">
            <button className="nav-back" onClick={onBack}>←</button>
            <div className="hero-img" style={{backgroundImage: `url(${theme.image_url})`}}></div>
            <div className="detail-body">
                <span className="badge-quest">OFFLINE</span>
                <h1>{theme.title}</h1>
                <p className="price">{theme.price} KRW</p>
                <div className="booking-form">
                    <input type="date" onChange={e=>setForm({...form, date:e.target.value})} />
                    <input type="number" min="1" value={form.people} onChange={e=>setForm({...form, people:e.target.value})} />
                    <button className="btn-quest" onClick={book}>Confirm</button>
                </div>
            </div>
        </div>
    );
}

function VoiceChat({ theme, username, onBack }) {
    const [chat, setChat] = useState([]);
    const [isRec, setIsRec] = useState(false);
    const [loading, setLoading] = useState(false);
    const [questTarget, setQuestTarget] = useState(null);
    const [voices, setVoices] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false); // 폭죽 상태

    const media = useRef(null);
    const chunks = useRef([]);
    const endRef = useRef(null);

    useEffect(() => {
        const load = () => setVoices(window.speechSynthesis.getVoices());
        load(); window.speechSynthesis.onvoiceschanged = load;
        endRef.current?.scrollIntoView({behavior:"smooth"});
    }, [chat, loading]);

    const getMimeType = () => {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
        if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
        return '';
    };

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mime = getMimeType();
            if (!mime) { alert("Audio not supported"); return; }
            media.current = new MediaRecorder(stream, { mimeType: mime });
            media.current.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
            media.current.onstop = send;
            media.current.start();
            setIsRec(true);
            chunks.current = [];
        } catch (err) { alert("Mic Error: " + err.message); }
    };

    const stop = () => {
        if(media.current && media.current.state !== 'inactive') {
            media.current.stop(); setIsRec(false); setLoading(true);
        }
    };

    const handleQuest = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/quest', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ username, theme_id: theme.id })
            });
            const data = await res.json();
            const q = data.quest_data;
            setQuestTarget(q.korean);
            setChat(p => [...p, {
                role: 'ai', isQuest: true,
                data: { korean: q.korean, romanized: q.romanized, english: "🔥 Quest: " + q.english, grammar: q.grammar, context: q.context, tech_score: 0 },
                audio: data.audio_base64
            }]);
        } catch { alert("Error"); } finally { setLoading(false); }
    };

    const send = async () => {
        if (chunks.current.length === 0) { setLoading(false); return; }
        const mime = media.current.mimeType;
        const blob = new Blob(chunks.current, { type: mime });
        if(blob.size < 500) { setLoading(false); return alert("Too short"); }

        const fd = new FormData();
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        fd.append('file', blob, `audio.${ext}`);
        fd.append('theme_id', theme.id);
        fd.append('username', username);
        if (questTarget) fd.append('quest_target', questTarget);

        try {
            const res = await fetch('http://localhost:8000/talk', { method: 'POST', body: fd });
            const data = await res.json();
            if(data.error) { alert(data.error); return; }

            if(data.audio_base64) {
                const s = data.structured_data;
                // [성공 조건] 퀘스트 타겟 존재 + 내용 일치 + 점수 30 이상
                const success = questTarget && s.content_match && s.tech_score >= 30;

                if (success) {
                    setQuestTarget(null);
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 4000); // 4초간 폭죽
                }

                const msg = {
                    role: 'ai', id: Date.now(), data: s,
                    tech_score: s.tech_score, isSuccess: success,
                    audio: `data:audio/mp3;base64,${data.audio_base64}`
                };
                setChat(p => [...p, { role: 'user', text: data.user_text }, msg]);
            }
        } catch { alert("Net Error"); } finally { setLoading(false); }
    };

    // [TTS 수정] 영어 강제 재생 로직
    const speak = (e, text, rate = 1.0, lang = 'ko-KR') => {
        if(e) e.stopPropagation();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate;

        if (lang === 'en-US') {
            const enVoice = voices.find(v => v.lang.startsWith('en'));
            if(enVoice) u.voice = enVoice;
        }
        window.speechSynthesis.speak(u);
    };

    return (
        <div className="screen chat-screen">
            {showConfetti && <Confetti />}
            <div className="q-header"><button onClick={onBack}>←</button><h2>{theme.title}</h2></div>
            <div className="chat-body">
                {chat.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                        {m.role === 'ai' ? (
                            <div className={`ai-card ${m.isQuest ? 'quest-highlight' : ''}`}>
                                <div className="ai-header">
                                    <div className="tech-badge"><span>📡 Score</span><strong>{m.data.tech_score}</strong></div>
                                    {m.isSuccess && <span className="badge-success">🎉 SUCCESS!</span>}
                                    {m.isQuest && <span className="badge-quest-label">CHALLENGE</span>}
                                </div>
                                <div className="card-content">
                                    <div className="main-sent">
                                        <div className="kor">{m.data.korean}</div>
                                        <div className="rom">{m.data.romanized}</div>
                                    </div>
                                    <div className="tts-controls">
                                        {[0.5, 1.0, 1.5, 2.0].map(r => (
                                            <button key={r} onClick={(e)=>speak(e, m.data.korean, r, 'ko-KR')}>{r}x</button>
                                        ))}
                                        <button className="btn-play" onClick={(e)=>speak(e, m.data.korean, 1.0, 'ko-KR')}>🔊</button>
                                    </div>
                                    <div className="info-box">
                                        <div className="info-row">
                                            <div className="info-header">
                                                <span className="label">Meaning</span>
                                            </div>
                                            <p>{m.data.english}</p>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-header">
                                                <span className="label">Grammar</span>
                                                {/* [수정] 영어로 읽기 */}
                                                <button className="btn-speak-mini" onClick={(e)=>speak(e, m.data.grammar, 1.0, 'en-US')}>🔊</button>
                                            </div>
                                            <p>{m.data.grammar}</p>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-header">
                                                <span className="label">Context</span>
                                                {/* [수정] 영어로 읽기 */}
                                                <button className="btn-speak-mini" onClick={(e)=>speak(e, m.data.context, 1.0, 'en-US')}>🔊</button>
                                            </div>
                                            <p>{m.data.context}</p>
                                        </div>
                                    </div>
                                    {/* 안내 문구 */}
                                    {!m.isQuest && (
                                        <p className="quest-guide">
                                            📣 <b>Tip:</b> Click 'Give me a Quest' below to verify your pronunciation!
                                        </p>
                                    )}
                                </div>
                                <div className="audio-control-box">
                                    <audio src={`data:audio/mp3;base64,${m.audio}`} controls className="au-player" />
                                </div>
                            </div>
                        ) : (
                            <div className="user-bubble">{m.text}</div>
                        )}
                    </div>
                ))}
                {loading && <div className="loading-bar">Analyzing...</div>}
                <div ref={endRef} />
            </div>

            <div className="bottom-area">
                <button className="btn-quest-mode" onClick={handleQuest}>🛡️ Give me a Quest</button>
                <div className="mic-wrapper">
                    <button onMouseDown={start} onMouseUp={stop} className={isRec?'rec-on':'rec-off'}>
                        {isRec ? 'Listening...' : '🎙️ Hold'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;