import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [view, setView] = useState('login');

    const refreshThemes = () => {
        fetch('http://localhost:8000/themes')
            .then(r => r.json())
            .then(setThemes)
            .catch(console.error);
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
                        setView('chat');
                    }}
                    onShowReport={()=>setView('report')}
                    onLogout={handleLogout}
                />
            )}

            {user && view === 'report' && (
                <ReportScreen username={user.username} onBack={()=>setView('list')} />
            )}

            {user && view === 'chat' && selectedTheme && (
                <VoiceChat
                    theme={selectedTheme}
                    username={user.username}
                    onBack={()=>setView('list')}
                />
            )}
        </div>
    );
}

function LoginScreen({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', fullName: '' });
    const [msg, setMsg] = useState('');

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isSignup ? '/register' : '/login';
        try {
            const res = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form)
            });
            const data = await res.json();
            if(res.ok) {
                if(isSignup) { setMsg("가입 성공! 로그인해주세요."); setIsSignup(false); }
                else onLogin(data);
            } else { setMsg("실패: " + (data.detail || "오류")); }
        } catch { setMsg("서버 연결 실패"); }
    };

    return (
        <div className="screen login-screen">
            <div className="login-box">
                <h1>🦋 Quest K</h1>
                <p className="subtitle">AI Language Tutor</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <input name="username" placeholder="ID" value={form.username} onChange={handleChange} required />
                    <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
                    {isSignup && <input name="fullName" placeholder="Name" value={form.fullName} onChange={handleChange} />}
                    <button type="submit">{isSignup ? "Register" : "Login"}</button>
                </form>
                <p className="msg-text">{msg}</p>
                <p onClick={() => setIsSignup(!isSignup)} className="switch-text">{isSignup ? "로그인하기" : "회원가입"}</p>
            </div>
        </div>
    );
}

function ThemeList({ themes, username, onSelect, onShowReport, onLogout }) {
    const list = Object.values(themes);
    return (
        <div className="screen">
            <div className="main-header">
                <div className="top-row">
                    <span>Hi, <b>{username}</b></span>
                    <div>
                        <button onClick={onShowReport} className="btn-icon">📊</button>
                        <button onClick={onLogout} className="btn-icon">🚪</button>
                    </div>
                </div>
                <h2>Select Quest</h2>
            </div>
            <div className="grid">
                {list.map(t => (
                    <div key={t.id} className="card" onClick={()=>onSelect(t.id)}>
                        <span className="icon">{t.icon || "✈️"}</span>
                        <div className="card-info">
                            <h4>{t.title}</h4>
                            <span>{t.price === 'Free' ? 'Free' : '₩'+t.price}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ReportScreen({ username, onBack }) {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        fetch(`http://localhost:8000/reports/${username}`).then(r=>r.json()).then(setLogs);
    }, [username]);

    return (
        <div className="screen">
            <div className="sub-header"><button onClick={onBack}>←</button><h2>My Analysis</h2></div>
            <div className="report-body">
                <div className="chart-box">
                    {logs.slice(0, 7).reverse().map((log, i) => (
                        <div key={i} className="bar-group">
                            <div className="bar" style={{height: `${log.tech_score}%`}}></div>
                            <span className="bar-label">{log.tech_score}</span>
                        </div>
                    ))}
                </div>
                <h3>History</h3>
                <ul className="log-list">
                    {logs.map((log, i) => (
                        <li key={i} className="log-item">
                            <div className="log-info">
                                <b>{log.theme_id}</b>
                                <small>{new Date(log.created_at).toLocaleDateString()}</small>
                            </div>
                            <div className="log-score">{log.tech_score}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function VoiceChat({ theme, username, onBack }) {
    const [chatLog, setChatLog] = useState([]);
    const [isRec, setIsRec] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState(null); // 토스트 메시지
    const mediaRef = useRef(null);
    const chunksRef = useRef([]);
    const chatEndRef = useRef(null);
    const audioRefs = useRef({});

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog, isLoading]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const getSupportedMimeType = () => {
        const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
        for (const type of types) if (MediaRecorder.isTypeSupported(type)) return type;
        return '';
    };

    const startRec = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            mediaRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            mediaRef.current.ondataavailable = e => { if(e.data.size > 0) chunksRef.current.push(e.data); };
            mediaRef.current.onstop = sendAudio;
            mediaRef.current.start(200);
            setIsRec(true);
            chunksRef.current = [];
        } catch { showToast("마이크 권한이 필요합니다."); }
    };

    const stopRec = () => {
        if(mediaRef.current && isRec) {
            setTimeout(()=> {
                if (mediaRef.current.state === "recording") mediaRef.current.stop();
                setIsRec(false); setIsLoading(true);
            }, 500);
        }
    };

    const sendAudio = async () => {
        if(chunksRef.current.length === 0) { setIsLoading(false); return; }

        const mimeType = mediaRef.current.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if(blob.size < 1024) {
            showToast("목소리가 감지되지 않았습니다.");
            setIsLoading(false); return;
        }

        let ext = 'webm';
        if (mimeType.includes('mp4')) ext = 'mp4';
        else if (mimeType.includes('wav')) ext = 'wav';

        const fd = new FormData();
        fd.append('file', blob, `audio.${ext}`);
        fd.append('theme_id', theme.id);
        fd.append('username', username);

        try {
            const res = await fetch('http://localhost:8000/talk', { method: 'POST', body: fd });
            const data = await res.json();

            if(data.audio_base64) {
                const s = data.structured_data;
                const msg = {
                    role: 'ai',
                    id: Date.now(),
                    korean: s.korean, romanized: s.romanized,
                    english: s.english, grammar: s.grammar,
                    expl: s.expl, tech_score: s.tech_score,
                    audio: `data:audio/mp3;base64,${data.audio_base64}`
                };
                setChatLog(p => [...p, { role: 'user', text: data.user_text }, msg]);
            } else {
                showToast("인식 오류: " + (data.error || "알 수 없는 에러"));
            }
        } catch (err) { showToast("서버 연결 실패"); } finally { setIsLoading(false); }
    };

    const changeAudioSpeed = (msgId, rate) => {
        const audio = audioRefs.current[msgId];
        if (audio) { audio.playbackRate = rate; audio.play(); }
    };

    const handleSpeak = (text, rate) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = rate;
        window.speechSynthesis.speak(u);
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
                                    <div className="tech-badge">
                                        <span>📡 Signal Analysis</span><strong>{m.tech_score}/100</strong>
                                    </div>

                                    {/* 한글 문장 + 배속 버튼 */}
                                    <div className="main-sent-section">
                                        <div className="main-sent">
                                            <div className="kor">{m.korean}</div>
                                            <div className="rom">{m.romanized}</div>
                                        </div>
                                        <div className="tts-controls">
                                            <span className="tts-label">🔊 읽기:</span>
                                            {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(rate => (
                                                <button key={rate} className="btn-speed-mini" onClick={()=>handleSpeak(m.korean, rate)}>{rate}x</button>
                                            ))}
                                        </div>
                                    </div>

                                    {m.grammar && <div className="grammar-box"><span>📘 Grammar: {m.grammar}</span></div>}
                                    <div className="details"><p>{m.english}</p><p className="expl">{m.expl}</p></div>

                                    {/* 전체 오디오 */}
                                    <div className="audio-control-box">
                                        <p className="audio-label">🎧 전체 설명 듣기:</p>
                                        <audio ref={el => audioRefs.current[m.id] = el} src={m.audio} controls className="audio-player" />
                                        <div className="speed-btns">
                                            {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(rate => (
                                                <button key={rate} onClick={() => changeAudioSpeed(m.id, rate)}>{rate}x</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : <span>{m.text}</span>}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="msg ai"><div className="bubble loading">분석중...</div></div>}
                <div ref={chatEndRef} />
            </div>

            {/* 토스트 알림 UI */}
            {toast && <div className="toast-msg">{toast}</div>}

            <div className="chat-ctrl"><button onMouseDown={startRec} onMouseUp={stopRec} className={isRec?'rec':''}>{isRec?'Listening...':'🎙️ Hold to Speak'}</button></div>
        </div>
    );
}

export default App;