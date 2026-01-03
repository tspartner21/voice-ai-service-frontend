import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [view, setView] = useState('login');

    const refreshThemes = () => {
        fetch('http://localhost:8000/themes').then(r=>r.json()).then(setThemes).catch(console.error);
    };

    useEffect(() => { if (view === 'list') refreshThemes(); }, [view]);

    const handleLogin = (userInfo) => { setUser(userInfo); setView('list'); };
    const handleLogout = () => { setUser(null); setView('login'); setSelectedTheme(null); };

    return (
        <div className="container">
            {view === 'login' && <LoginScreen onLogin={handleLogin} />}

            {user && view === 'list' && (
                <ThemeList
                    themes={themes}
                    username={user.username}
                    onSelect={(id)=>{
                        const t = themes[id];
                        setSelectedTheme({...t, id});
                        setView(t.category === 'offline' ? 'detail' : 'chat');
                    }}
                    onMenu={(menu)=>setView(menu)}
                    onLogout={handleLogout}
                />
            )}

            {user && view === 'report' && <ReportScreen username={user.username} onBack={()=>setView('list')} />}
            {user && view === 'bookings' && <BookingListScreen username={user.username} onBack={()=>setView('list')} />}

            {user && view === 'detail' && selectedTheme && (
                <ProductDetail theme={selectedTheme} username={user.username} onBack={()=>setView('list')} />
            )}

            {user && view === 'chat' && selectedTheme && (
                <VoiceChat theme={selectedTheme} username={user.username} onBack={()=>setView('list')} />
            )}
        </div>
    );
}

function LoginScreen({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', fullName: '' });
    const handleSubmit = async (e) => {
        e.preventDefault(); const endpoint = isSignup ? '/register' : '/login';
        try {
            const res = await fetch(`http://localhost:8000${endpoint}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
            const data = await res.json();
            if(res.ok) { if(isSignup) { alert("가입 성공!"); setIsSignup(false); } else onLogin(data); }
            else alert("Error: " + data.detail);
        } catch { alert("Server Error"); }
    };
    return (
        <div className="screen login-screen">
            <div className="login-logo">Q</div>
            <div className="login-box">
                <h1>QUEST K</h1>
                <p>Level Up Your Korean</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <input name="username" placeholder="ID" value={form.username} onChange={e=>setForm({...form,[e.target.name]:e.target.value})} required/>
                    <input name="password" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,[e.target.name]:e.target.value})} required/>
                    {isSignup && <input name="fullName" placeholder="Name" value={form.fullName} onChange={e=>setForm({...form,[e.target.name]:e.target.value})} />}
                    <button type="submit">{isSignup?"Register":"Login"}</button>
                </form>
                <p onClick={()=>setIsSignup(!isSignup)} className="switch-text">{isSignup?"Go Login":"Go Sign Up"}</p>
            </div>
        </div>
    );
}

function ThemeList({ themes, username, onSelect, onMenu, onLogout }) {
    const [tab, setTab] = useState('basic');
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;

    const list = Object.values(themes).filter(t => t.category === tab);
    const totalPages = Math.ceil(list.length / itemsPerPage);
    const items = list.slice((page-1)*itemsPerPage, page*itemsPerPage);

    return (
        <div className="screen">
            <div className="q-header">
                <div className="top-row">
                    <span>Hi, <b>{username}</b></span>
                    <div>
                        <button onClick={()=>onMenu('bookings')} className="btn-icon">📅</button>
                        <button onClick={()=>onMenu('report')} className="btn-icon">📊</button>
                        <button onClick={onLogout} className="btn-icon">🚪</button>
                    </div>
                </div>
                <h2>Select Quest</h2>
            </div>
            <div className="q-tabs">
                <button className={`tab ${tab==='basic'?'active':''}`} onClick={()=>{setTab('basic'); setPage(1);}}>Online</button>
                <button className={`tab ${tab==='offline'?'active':''}`} onClick={()=>{setTab('offline'); setPage(1);}}>Offline</button>
            </div>
            <div className="grid">
                {items.length>0 ? items.map(t => (
                    <div key={t.id} className="card" onClick={()=>onSelect(t.id)}>
                        <span className="icon">{t.icon}</span>
                        <div className="card-info"><h4>{t.title}</h4></div>
                    </div>
                )) : <div className="no-data">Empty</div>}
            </div>
            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>&lt;</button>
                    {Array.from({length:totalPages},(_,i)=><button key={i} className={page===i+1?'active':''} onClick={()=>setPage(i+1)}>{i+1}</button>)}
                    <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>&gt;</button>
                </div>
            )}
        </div>
    );
}

function BookingListScreen({ username, onBack }) {
    const [list, setList] = useState([]);
    useEffect(() => { fetch(`http://localhost:8000/bookings/${username}`).then(r=>r.json()).then(setList); }, [username]);
    const handleCancel = async (id) => {
        if(!confirm("Cancel?")) return;
        await fetch('http://localhost:8000/bookings/cancel', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({booking_id: id}) });
        setList(list.filter(b => b.id !== id));
    };
    return (
        <div className="screen">
            <div className="q-header"><button onClick={onBack}>←</button><h2>Bookings</h2></div>
            <div className="report-body">
                {list.length===0?<p className="no-data">No bookings.</p>:
                    <ul className="log-list">{list.map(b=>(<li key={b.id} className="log-item booking-item"><div><b>{b.theme_title}</b><div className="book-meta">📅 {b.reserved_date} | 👤 {b.people}</div></div><button className="btn-cancel" onClick={()=>handleCancel(b.id)}>Cancel</button></li>))}</ul>}
            </div>
        </div>
    );
}

function ProductDetail({ theme, username, onBack }) {
    const [form, setForm] = useState({ date: '', people: 1 });
    const handleBook = async () => {
        if(!form.date) return alert("Date required.");
        try {
            const res = await fetch('http://localhost:8000/book', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, theme_id: theme.id, ...form }) });
            if(res.ok) { alert("Booked!"); onBack(); } else alert("Failed");
        } catch { alert("Error"); }
    };
    return (
        <div className="screen detail-screen">
            <button className="nav-back" onClick={onBack}>←</button>
            <div className="hero-img" style={{backgroundImage: `url(${theme.image_url || 'https://via.placeholder.com/400'})`}}></div>
            <div className="detail-body">
                <span className="badge-quest">OFFLINE</span>
                <h1>{theme.title}</h1>
                <p className="price">{theme.price} KRW</p>
                <div className="booking-form">
                    <h3>Reserve Now</h3>
                    <label>Date: <input type="date" onChange={e=>setForm({...form, date:e.target.value})} /></label>
                    <label>People: <input type="number" min="1" value={form.people} onChange={e=>setForm({...form, people:e.target.value})} /></label>
                    <button className="btn-quest" onClick={handleBook}>Confirm Booking</button>
                </div>
            </div>
        </div>
    );
}

function ReportScreen({ username, onBack }) {
    const [logs, setLogs] = useState([]);
    useEffect(() => { fetch(`http://localhost:8000/reports/${username}`).then(r=>r.json()).then(setLogs); }, [username]);

    // [날짜 오류 해결] 서버에서 온 시간을 한국 시간으로 표시
    const graphData = [...logs].reverse();
    const formatDate = (dateStr) => new Date(dateStr).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' });

    return (
        <div className="screen">
            <div className="q-header"><button onClick={onBack}>←</button><h2>Analysis</h2></div>
            <div className="report-body">
                <div className="chart-box">
                    {graphData.map((l,i) => (
                        <div key={i} className="bar-group">
                            <div className="bar" style={{height: `${Math.max(l.tech_score, 5)}%`}}></div>
                            <span className="bar-label">{l.tech_score}</span>
                        </div>
                    ))}
                </div>
                <ul className="log-list">
                    {logs.map((l,i) => (
                        <li key={i} className="log-item">
                            <div><b>{l.theme_id}</b><small>{formatDate(l.created_at)}</small></div>
                            <div className="log-score">{l.tech_score}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// --- [VoiceChat] 독창적 UI + 기능 통합 ---
function VoiceChat({ theme, username, onBack }) {
    const [chatLog, setChatLog] = useState([]);
    const [isRec, setIsRec] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 개별 메시지 상태 관리 (언어 토글용)
    const [msgStates, setMsgStates] = useState({});

    const mediaRef = useRef(null);
    const chunksRef = useRef([]);
    const chatEndRef = useRef(null);
    const audioRefs = useRef({});

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog, isLoading]);

    const startRec = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRef.current = new MediaRecorder(stream);
            mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
            mediaRef.current.onstop = sendAudio;
            mediaRef.current.start();
            setIsRec(true);
            chunksRef.current = [];
        } catch { alert("Mic Error"); }
    };

    const stopRec = () => {
        if(mediaRef.current && isRec) {
            mediaRef.current.stop(); setIsRec(false); setIsLoading(true);
        }
    };

    const sendAudio = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if(blob.size < 1000) { alert("Voice not detected"); setIsLoading(false); return; }

        const fd = new FormData();
        fd.append('file', blob, "audio.webm");
        fd.append('theme_id', theme.id);
        fd.append('username', username);

        try {
            const res = await fetch('http://localhost:8000/talk', { method: 'POST', body: fd });
            const data = await res.json();
            if(data.audio_base64) {
                const s = data.structured_data;
                const id = Date.now();
                const msg = {
                    role: 'ai',
                    id: id,
                    data: s,
                    tech_score: s.tech_score,
                    audio: `data:audio/mp3;base64,${data.audio_base64}`
                };
                setChatLog(p => [...p, { role: 'user', text: data.user_text }, msg]);
                setMsgStates(p => ({...p, [id]: 'kor'})); // 기본은 한국어
            } else { alert("Error: " + data.error); }
        } catch { alert("Net Error"); } finally { setIsLoading(false); }
    };

    const handleSpeak = (text, rate) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = rate;
        window.speechSynthesis.speak(u);
    };

    const toggleLang = (id) => {
        setMsgStates(p => ({...p, [id]: p[id] === 'kor' ? 'eng' : 'kor'}));
    };

    return (
        <div className="screen chat-screen">
            <div className="q-header"><button onClick={onBack}>←</button><h2>{theme.title}</h2></div>

            <div className="chat-body">
                {chatLog.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                        {m.role === 'ai' ? (
                            <div className="ai-card">
                                <div className="tech-badge"><span>📡 Deep Tech Score</span><strong>{m.tech_score}</strong></div>

                                <div className="card-content">
                                    {/* 언어 토글 버튼 */}
                                    <div className="lang-toggle">
                                        <button onClick={()=>toggleLang(m.id)}>
                                            {msgStates[m.id]==='kor' ? '🇰🇷 KOR' : '🇺🇸 ENG'} 🔄
                                        </button>
                                    </div>

                                    {/* 메인 문장 (한/영 전환) */}
                                    <div className="main-sent">
                                        {msgStates[m.id]==='kor' ? (
                                            <>
                                                <div className="kor">{m.data.korean}</div>
                                                <div className="rom">{m.data.romanized}</div>
                                            </>
                                        ) : (
                                            <div className="eng-main">{m.data.english_meaning}</div>
                                        )}
                                    </div>

                                    {/* 배속 버튼 (한글일 때만 유효하지만 항상 표시) */}
                                    <div className="tts-controls">
                                        <span>SPEED:</span>
                                        {[0.5, 1.0, 1.5, 2.0].map(rate => (
                                            <button key={rate} onClick={()=>handleSpeak(m.data.korean, rate)}>{rate}x</button>
                                        ))}
                                        <button className="btn-play" onClick={()=>handleSpeak(m.data.korean, 1.0)}>🔊</button>
                                    </div>

                                    {/* 문법 및 상황설명 (한/영 전환) */}
                                    <div className="info-box">
                                        <div className="info-row">
                                            <span className="label">Grammar</span>
                                            <p>{msgStates[m.id]==='kor' ? m.data.grammar_kor : m.data.grammar_eng}</p>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Context</span>
                                            <p>{msgStates[m.id]==='kor' ? m.data.expl_kor : m.data.expl_eng}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="audio-control-box">
                                    <audio src={m.audio} controls className="audio-player" />
                                </div>
                            </div>
                        ) : (
                            <div className="user-bubble">{m.text}</div>
                        )}
                    </div>
                ))}
                {isLoading && <div className="msg ai"><div className="bubble loading">Analyzing...</div></div>}
                <div ref={chatEndRef} />
            </div>
            <div className="chat-ctrl"><button onMouseDown={startRec} onMouseUp={stopRec} className={isRec?'rec':''}>{isRec?'Listening...':'🎙️ Hold'}</button></div>
        </div>
    );
}

export default App;