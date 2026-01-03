import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [view, setView] = useState('login');

    useEffect(() => { if (view === 'list') fetch('http://localhost:8000/themes').then(r=>r.json()).then(setThemes); }, [view]);

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
            <div className="login-logo">N</div>
            <div className="login-box">
                <h1>QUEST K</h1>
                <p>Smart Language Mate</p>
                <form onSubmit={handleSubmit}>
                    <input placeholder="ID (1111)" onChange={e=>setForm({...form, username:e.target.value})} />
                    <input type="password" placeholder="PW (1111)" onChange={e=>setForm({...form, password:e.target.value})} />
                    <button type="submit" className="btn-naver">로그인</button>
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
            <div className="n-header">
                <h2>Quest K</h2>
                <div>
                    <button onClick={()=>onMenu('bookings')}>📅</button>
                    <button onClick={()=>onMenu('report')}>📊</button>
                    <button onClick={onLogout}>🚪</button>
                </div>
            </div>
            <div className="n-tabs">
                <button className={tab==='basic'?'active':''} onClick={()=>setTab('basic')}>온라인</button>
                <button className={tab==='offline'?'active':''} onClick={()=>setTab('offline')}>오프라인</button>
            </div>
            <div className="n-list">
                {list.map(t => (
                    <div key={t.id} className="n-card" onClick={()=>onSelect(t.id)}>
                        <div className="n-icon">{t.icon}</div>
                        <div className="n-info">
                            <h4>{t.title}</h4>
                            <span className="n-tag">{t.price}</span>
                        </div>
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
        if(confirm("취소하시겠습니까?")) {
            await fetch('http://localhost:8000/bookings/cancel', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({booking_id: id}) });
            setList(list.filter(b => b.id !== id));
        }
    }
    return (
        <div className="screen">
            <div className="n-header"><button onClick={onBack}>←</button><h2>예약 내역</h2></div>
            <ul className="n-list-simple">
                {list.length===0?<p>예약 없음</p>:list.map(b=><li key={b.id}><b>{b.theme_title}</b><span>{b.reserved_date}</span><button onClick={()=>cancel(b.id)}>X</button></li>)}
            </ul>
        </div>
    );
}

function ReportScreen({ username, onBack }) {
    const [logs, setLogs] = useState([]);
    useEffect(() => { fetch(`http://localhost:8000/reports/${username}`).then(r=>r.json()).then(setLogs); }, [username]);
    const graphData = [...logs].reverse();
    return (
        <div className="screen">
            <div className="n-header"><button onClick={onBack}>←</button><h2>학습 리포트</h2></div>
            <div className="n-chart">
                {graphData.map((l,i) => (
                    <div key={i} className="bar-col">
                        <div className="bar" style={{height: `${Math.max(l.tech_score, 5)}%`}}></div>
                        <span>{l.tech_score}</span>
                    </div>
                ))}
            </div>
            <ul className="n-list-simple">
                {logs.map((l,i)=><li key={i}><span>{new Date(l.created_at).toLocaleDateString()}</span><b>{l.theme_id}</b><span className="score">{l.tech_score}점</span></li>)}
            </ul>
        </div>
    );
}

function ProductDetail({ theme, username, onBack }) {
    const [date, setDate] = useState('');
    const [people, setPeople] = useState(1);
    const book = async () => {
        if(!date) return alert("날짜를 선택하세요");
        const res = await fetch('http://localhost:8000/book', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({username, theme_id: theme.id, date, people})
        });
        if(res.ok) { alert("예약 완료"); onBack(); }
    };
    return (
        <div className="screen">
            <div className="n-header"><button onClick={onBack}>←</button><h2>상세 정보</h2></div>
            <div className="n-detail">
                <div className="img-box" style={{backgroundImage: `url(${theme.image_url})`}}></div>
                <h3>{theme.title}</h3>
                <p className="price">{theme.price}원</p>
                <div className="book-box">
                    <input type="date" onChange={e=>setDate(e.target.value)} />
                    <input type="number" min="1" value={people} onChange={e=>setPeople(e.target.value)} />
                    <button className="btn-naver full" onClick={book}>예약하기</button>
                </div>
            </div>
        </div>
    );
}

function VoiceChat({ theme, username, onBack }) {
    const [chat, setChat] = useState([]);
    const [isRec, setIsRec] = useState(false);
    const [loading, setLoading] = useState(false);
    const media = useRef(null);
    const chunks = useRef([]);
    const endRef = useRef(null);

    // 각 메시지별 언어 상태 관리
    const [langModes, setLangModes] = useState({});

    useEffect(() => endRef.current?.scrollIntoView({behavior:"smooth"}), [chat, loading]);

    const start = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        media.current = new MediaRecorder(stream);
        media.current.ondataavailable = e => chunks.current.push(e.data);
        media.current.onstop = send;
        media.current.start();
        setIsRec(true);
        chunks.current = [];
    };

    const stop = () => { if(media.current) media.current.stop(); setIsRec(false); setLoading(true); };

    const send = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if(blob.size < 1000) { setLoading(false); return alert("목소리가 작습니다"); }

        const fd = new FormData();
        fd.append('file', blob, "audio.webm");
        fd.append('theme_id', theme.id);
        fd.append('username', username);

        try {
            const res = await fetch('http://localhost:8000/talk', { method: 'POST', body: fd });
            const data = await res.json();
            if(data.structured_data) {
                const id = Date.now();
                setChat(p => [...p, { role: 'user', text: data.user_text }, { role: 'ai', id, data: data.structured_data, audio: data.audio_base64 }]);
                setLangModes(p => ({...p, [id]: 'kor'})); // Default Korean
            }
        } catch { alert("Error"); } finally { setLoading(false); }
    };

    const speak = (text) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        window.speechSynthesis.speak(u);
    };

    const toggleLang = (id) => {
        setLangModes(p => ({...p, [id]: p[id] === 'kor' ? 'eng' : 'kor'}));
    };

    return (
        <div className="screen chat-bg">
            <div className="n-header"><button onClick={onBack}>←</button><h2>{theme.title}</h2></div>
            <div className="chat-list">
                {chat.map((m, i) => (
                    <div key={i} className={`msg-row ${m.role}`}>
                        {m.role === 'ai' ? (
                            <div className="ai-card">
                                {/* 딥테크 스코어 헤더 */}
                                <div className="ai-header">
                                    <span className="badge-naver">NAVER AI Analysis</span>
                                    <span className="score-num">{m.data.tech_score}점</span>
                                </div>

                                {/* 메인 문장 */}
                                <div className="main-sent">
                                    <h3>{m.data.korean}</h3>
                                    <p>{m.data.romanized}</p>
                                    <button className="btn-speak" onClick={()=>speak(m.data.korean)}>🔊 듣기</button>
                                </div>

                                {/* 팁 박스 (네이버 지식스니펫 스타일) */}
                                <div className="tip-box">
                                    <strong>💡 Quest Tip</strong>
                                    <p>{m.data.tip}</p>
                                </div>

                                {/* 설명 영역 (토글 버튼 포함) */}
                                <div className="expl-area">
                                    <div className="expl-header">
                                        <span>설명 모드</span>
                                        <div className="toggle-switch">
                                            <button className={langModes[m.id]==='kor'?'active':''} onClick={()=>toggleLang(m.id)}>한글</button>
                                            <button className={langModes[m.id]==='eng'?'active':''} onClick={()=>toggleLang(m.id)}>ENG</button>
                                        </div>
                                    </div>
                                    <div className="expl-content">
                                        <p><b>문법:</b> {langModes[m.id]==='kor' ? m.data.grammar_kor : m.data.grammar_eng}</p>
                                        <p><b>상황:</b> {langModes[m.id]==='kor' ? m.data.expl_kor : m.data.expl_eng}</p>
                                    </div>
                                </div>
                                <audio src={`data:audio/mp3;base64,${m.audio}`} controls className="au-player" />
                            </div>
                        ) : (
                            <div className="user-bubble">{m.text}</div>
                        )}
                    </div>
                ))}
                {loading && <div className="loading-bar">분석중...</div>}
                <div ref={endRef} />
            </div>
            <div className="bottom-mic">
                <button onMouseDown={start} onMouseUp={stop} className={isRec?'rec-on':'rec-off'}>
                    {isRec ? '듣고 있어요...' : '🎙️ 눌러서 말하기'}
                </button>
            </div>
        </div>
    );
}

export default App;