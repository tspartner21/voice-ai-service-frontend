import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [view, setView] = useState('login');

    const refreshThemes = () => {
        fetch('http://localhost:8000/themes').then(res => res.json()).then(setThemes).catch(console.error);
    };

    useEffect(() => { if (view === 'list' || view === 'admin') refreshThemes(); }, [view]);
    const handleLogin = (userInfo) => { setUser(userInfo); setView(userInfo.role === 'admin' ? 'admin' : 'list'); };
    const handleLogout = () => { setUser(null); setView('login'); setSelectedTheme(null); };

    return (
        <div className="container">
            {view === 'login' && <LoginScreen onLogin={handleLogin} />}
            {user && view === 'admin' && <div className="screen">Admin Page</div>}
            {user && view === 'list' && <ThemeList themes={themes} username={user.username} onSelect={(id)=>{ const t = themes[id]; setSelectedTheme({...t, id}); setView(t.category==='offline'?'detail':'chat'); }} onMyBookings={()=>setView('my_bookings')} onLogout={handleLogout} />}
            {user && view === 'my_bookings' && <div className="screen"><button onClick={()=>setView('list')}>Back</button></div>}
            {user && view === 'detail' && selectedTheme && <ProductDetail theme={selectedTheme} username={user.username} onBack={()=>setView('list')} onStartChat={()=>setView('chat')} />}
            {user && view === 'chat' && selectedTheme && <VoiceChat theme={selectedTheme} onBack={()=>setView('list')} />}
        </div>
    );
}

function LoginScreen({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', fullName: '', phone: '', address: '' });
    const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); };
    const handleSubmit = async (e) => {
        e.preventDefault(); const endpoint = isSignup ? '/register' : '/login';
        const body = isSignup ? { username: form.username, password: form.password, full_name: form.fullName, phone: form.phone, address: form.address } : { username: form.username, password: form.password };
        try {
            const res = await fetch(`http://localhost:8000${endpoint}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
            const data = await res.json();
            if (res.ok) { if (isSignup) { alert("Success!"); setIsSignup(false); } else { onLogin({ username: data.username, role: data.role }); } } else { alert("Failed: " + JSON.stringify(data.detail)); }
        } catch { alert("Network Error"); }
    };
    return ( <div className="screen login-screen"><h1>🦋 Quest K</h1><div className="login-box"><h2>{isSignup ? "Sign Up" : "Login"}</h2><form onSubmit={handleSubmit} className="login-form"><input name="username" placeholder="ID" value={form.username} onChange={handleChange} required/><input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required/>{isSignup && <><input name="fullName" placeholder="Name" value={form.fullName} onChange={handleChange}/><input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange}/><input name="address" placeholder="Address" value={form.address} onChange={handleChange}/></>}<button type="submit">{isSignup ? "Register" : "Login"}</button></form><p onClick={() => setIsSignup(!isSignup)} className="switch-text">{isSignup ? "Login" : "Sign Up"}</p></div></div> );
}

function ThemeList({ themes, username, onSelect, onMyBookings, onLogout }) {
    const offline = Object.values(themes).filter(t => t.category === 'offline');
    const basic = Object.values(themes).filter(t => t.category === 'basic');
    return (
        <div className="screen list-screen">
            <div className="main-header"><div className="top-row"><span>Hi, <b>{username}</b></span><div><button onClick={onMyBookings}>My Trips</button><button onClick={onLogout} className="logout">Out</button></div></div><h1>✈️ Quest K</h1></div>
            <div className="section"><h3>📚 Basic Training (AI Tutor)</h3><div className="grid">{basic.map(t => (<div key={t.id} className="card-small" onClick={() => onSelect(t.id)}><span className="icon">{t.icon}</span><span>{t.title}</span></div>))}</div></div>
            <div className="section"><h3>✨ Offline Quests (Real Trip)</h3>{offline.map(t => (<div key={t.id} className="card-wide" onClick={() => onSelect(t.id)}><div className="img" style={{backgroundImage: `url(${t.image_url || 'https://via.placeholder.com/400'})`}}></div><div className="info"><h4>{t.title}</h4><span>{t.price}</span></div></div>))}</div>
        </div>
    );
}
function ProductDetail({ theme, username, onBack, onStartChat }) { return (<div className="screen detail-screen"><button className="nav-back" onClick={onBack}>←</button><div className="hero-img" style={{backgroundImage: `url(${theme.image_url || 'https://via.placeholder.com/400'})`}}></div><div className="detail-body"><h1>{theme.title}</h1><p className="price">{theme.price}</p><p className="desc">{theme.desc}</p><div className="ai-box"><button onClick={onStartChat}>🦋 Start Deep Tech Training</button></div></div></div>); }

// --- [Voice Chat Component] ---
function VoiceChat({ theme, onBack }) {
    const [chatLog, setChatLog] = useState([]);
    const [isRec, setIsRec] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const mediaRef = useRef(null);
    const chunksRef = useRef([]);
    const chatEndRef = useRef(null);
    const audioRefs = useRef({});

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog, isLoading]);

    const getSupportedMimeType = () => {
        const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
        for (const type of types) if (MediaRecorder.isTypeSupported(type)) return type;
        return '';
    };

    const startRec = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : {};

            mediaRef.current = new MediaRecorder(stream, options);
            mediaRef.current.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mediaRef.current.onstop = sendAudio;
            mediaRef.current.start(200);
            setIsRec(true);
            chunksRef.current = [];
        } catch { alert("마이크 권한이 필요합니다."); }
    };

    const stopRec = () => {
        if (mediaRef.current && isRec) {
            setTimeout(() => { if (mediaRef.current.state === "recording") mediaRef.current.stop(); setIsRec(false); setIsLoading(true); }, 500);
        }
    };

    const sendAudio = async () => {
        if (chunksRef.current.length === 0) { setIsLoading(false); return; }

        const mimeType = mediaRef.current.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size < 500) {
            alert("목소리가 너무 작습니다. 다시 말씀해 주세요.");
            setIsLoading(false); return;
        }

        let ext = 'webm';
        if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('wav')) ext = 'wav';

        const fd = new FormData();
        fd.append('file', blob, `audio.${ext}`);
        fd.append('theme_id', theme.id);

        try {
            const res = await fetch('http://localhost:8000/talk', { method: 'POST', body: fd });
            const data = await res.json();

            if (data.audio_base64) {
                const struct = data.structured_data || {};
                const msgId = Date.now();
                const aiMessage = {
                    role: 'ai',
                    id: msgId,
                    korean: struct.korean,
                    romanized: struct.romanized,
                    english: struct.english,
                    grammar: struct.grammar_point,
                    explanation: struct.explanation,
                    tech_score: struct.tech_score,
                    audio: `data:audio/mp3;base64,${data.audio_base64}`
                };
                setChatLog(p => [...p, { role: 'user', text: data.user_text }, aiMessage]);
            } else {
                alert("인식 오류: " + (data.error || "알 수 없는 에러"));
            }
        } catch (err) { alert("서버 연결 실패"); console.error(err); } finally { setIsLoading(false); }
    };

    const changeAudioSpeed = (msgId, rate) => {
        const audio = audioRefs.current[msgId];
        if (audio) { audio.playbackRate = rate; audio.play(); }
    };

    // [수정] 한글 TTS 속도 조절 및 재생 함수
    const handleSpeak = (text, rate) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // 기존 음성 중단
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = rate; // 속도 적용
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="screen chat-screen">
            <div className="sub-header"><button onClick={onBack}>←</button><h2>{theme.title}</h2></div>
            <div className="chat-body">
                {chatLog.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                        <div className="bubble">
                            {m.role === 'ai' ? (
                                <div className="ai-content">
                                    {/* 딥테크 분석 뱃지 */}
                                    <div className="tech-badge-container">
                                        <div className="tech-badge">
                                            <span>📡 Signal Analysis</span>
                                            <strong>{m.tech_score} / 100</strong>
                                        </div>
                                        <div className="tooltip-icon">ℹ️
                                            <div className="tooltip-text">
                                                <h4>딥테크 분석 원리</h4>
                                                <p><b>MFCC:</b> 사용자 음성 파형 정밀 분석</p>
                                                <p><b>DTW:</b> 시계열 매칭 알고리즘 적용</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* [수정됨] 한글 문장 + TTS 배속 버튼들 */}
                                    <div className="main-sent-section">
                                        <div className="main-sent">
                                            <div className="kor">{m.korean}</div>
                                            <div className="rom">{m.romanized}</div>
                                        </div>
                                        {/* 문장 옆(아래)에 배속 버튼 배치 */}
                                        <div className="tts-controls">
                                            <span className="tts-label">🔊 Listen:</span>
                                            {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(rate => (
                                                <button
                                                    key={rate}
                                                    onClick={() => handleSpeak(m.korean, rate)}
                                                    className="btn-tts"
                                                >
                                                    {rate}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {m.grammar && <div className="grammar-box"><span>📘 Grammar: {m.grammar}</span></div>}

                                    <div className="details">
                                        <p className="eng">{m.english}</p>
                                        <p className="expl">{m.explanation}</p>
                                    </div>

                                    {/* 전체 오디오(설명 포함) 배속 컨트롤 */}
                                    <div className="audio-control-box">
                                        <p className="audio-label">🎧 Full Lesson:</p>
                                        <audio ref={el => audioRefs.current[m.id] = el} src={m.audio} controls className="audio-player" />
                                        <div className="speed-btns">
                                            {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(rate => (
                                                <button key={rate} onClick={() => changeAudioSpeed(m.id, rate)}>{rate}x</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : ( <span className="user-text">{m.text}</span> )}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="msg ai"><div className="bubble loading">Analyzing Signal... 📡</div></div>}
                <div ref={chatEndRef} />
            </div>
            <div className="chat-ctrl"><button onMouseDown={startRec} onMouseUp={stopRec} className={isRec ? 'rec' : ''}>{isRec ? 'Listening...' : '🎙️ Hold to Speak (English)'}</button></div>
        </div>
    );
}

export default App;