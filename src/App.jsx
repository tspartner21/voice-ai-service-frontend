import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [view, setView] = useState('login');

    const refreshThemes = () => {
        fetch('http://localhost:8000/themes')
            .then(res => res.json())
            .then(setThemes)
            .catch(console.error);
    };

    useEffect(() => {
        if (view === 'list' || view === 'admin') refreshThemes();
    }, [view]);

    const handleLogin = (userInfo) => {
        setUser(userInfo);
        setView(userInfo.role === 'admin' ? 'admin' : 'list');
    };

    const handleLogout = () => {
        setUser(null);
        setView('login');
        setSelectedTheme(null);
    };

    return (
        <div className="container">
            {view === 'login' && <LoginScreen onLogin={handleLogin} />}

            {user && view === 'admin' && (
                <AdminDashboard onLogout={handleLogout} onRefresh={refreshThemes} />
            )}

            {user && view === 'list' && (
                <ThemeList
                    themes={themes}
                    username={user.username}
                    onSelect={(id)=>{
                        const t = themes[id];
                        setSelectedTheme({...t, id});
                        setView(t.category==='offline'?'detail':'chat');
                    }}
                    onMyBookings={()=>setView('my_bookings')}
                    onLogout={handleLogout}
                />
            )}

            {user && view === 'my_bookings' && (
                <MyBookings username={user.username} onBack={()=>setView('list')} />
            )}

            {user && view === 'detail' && selectedTheme && (
                <ProductDetail
                    theme={selectedTheme}
                    username={user.username}
                    onBack={()=>setView('list')}
                    onStartChat={()=>setView('chat')}
                />
            )}

            {user && view === 'chat' && selectedTheme && (
                <VoiceChat theme={selectedTheme} onBack={()=>setView('list')} />
            )}
        </div>
    );
}

// [수정됨] 회원가입 에러 처리 및 데이터 매핑 수정
function LoginScreen({ onLogin }) {
    const [isSignup, setIsSignup] = useState(false);
    const [form, setForm] = useState({
        username: '',
        password: '',
        fullName: '',
        phone: '',
        address: ''
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isSignup ? '/register' : '/login';

        // [중요] 백엔드(Python) 변수명(snake_case)에 맞춰서 데이터 전송
        const body = isSignup ?
            {
                username: form.username,
                password: form.password,
                full_name: form.fullName, // JS: fullName -> Python: full_name
                phone: form.phone,
                address: form.address
            } :
            {
                username: form.username,
                password: form.password
            };

        try {
            const res = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                if (isSignup) {
                    alert("가입 성공! 로그인해주세요.");
                    setIsSignup(false);
                } else {
                    onLogin({ username: data.username, role: data.role });
                }
            } else {
                // [수정] 에러 메시지가 객체일 경우 문자열로 변환하여 표시 ([object Object] 방지)
                const errorMsg = typeof data.detail === 'string'
                    ? data.detail
                    : JSON.stringify(data.detail);
                alert("실패: " + errorMsg);
            }
        } catch (err) {
            alert("서버 연결 실패");
        }
    };

    return (
        <div className="screen login-screen">
            <h1>🦋 Quest K</h1>
            <div className="login-box">
                <h2>{isSignup ? "Sign Up" : "Login"}</h2>
                <form onSubmit={handleSubmit} className="login-form">
                    <input name="username" placeholder="ID" value={form.username} onChange={handleChange} required/>
                    <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required/>

                    {isSignup && (
                        <>
                            <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required/>
                            <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} required/>
                            <input name="address" placeholder="Address" value={form.address} onChange={handleChange} required/>
                        </>
                    )}

                    <button type="submit">{isSignup ? "Register" : "Login"}</button>
                </form>
                <p onClick={() => setIsSignup(!isSignup)} className="switch-text">
                    {isSignup ? "로그인하러 가기" : "회원가입 하기"}
                </p>

                {!isSignup && (
                    <div className="help-text">
                        테스트: admin/admin, user/user
                    </div>
                )}
            </div>
        </div>
    );
}

function AdminDashboard({ onLogout, onRefresh }) {
    const [tab, setTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [form, setForm] = useState({ id: '', title: '', price: '', desc: '' });
    const [file, setFile] = useState(null);

    useEffect(() => { if (tab === 'bookings') loadBookings(); }, [tab]);
    const loadBookings = () => { fetch('http://localhost:8000/bookings/all').then(r=>r.json()).then(d=>Array.isArray(d)?setBookings(d):setBookings([])); };

    const handleAdd = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('id', form.id); fd.append('title', form.title);
        fd.append('price', form.price); fd.append('desc', form.desc);
        if (file) fd.append('file', file);
        try {
            const res = await fetch('http://localhost:8000/admin/products', { method: 'POST', body: fd });
            if (res.ok) { alert("등록 완료"); setForm({id:'',title:'',price:'',desc:''}); setFile(null); onRefresh(); }
            else alert("등록 실패");
        } catch { alert("에러"); }
    };

    const handleCancel = async (id) => {
        if(confirm("삭제?")) {
            await fetch('http://localhost:8000/bookings/cancel', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({booking_id: id}) });
            loadBookings();
        }
    };

    return (
        <div className="screen admin-screen">
            <div className="admin-header"><h2>Admin</h2><div className="admin-tabs"><button onClick={()=>setTab('bookings')}>예약</button><button onClick={()=>setTab('products')}>등록</button></div><button onClick={onLogout}>Exit</button></div>
            {tab === 'bookings' ? (
                <div className="booking-list">{bookings.map(b=>(<div key={b.id} className="booking-row"><div><b>{b.username}</b>-{b.theme_title}<small>({b.start_date})</small></div><button onClick={()=>handleCancel(b.id)} className="btn-del">X</button></div>))}</div>
            ) : (
                <form onSubmit={handleAdd} className="product-form">
                    <input placeholder="ID (eng)" value={form.id} onChange={e=>setForm({...form, id:e.target.value})} required/>
                    <input placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required/>
                    <input placeholder="Price" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} required/>
                    <textarea placeholder="Desc" value={form.desc} onChange={e=>setForm({...form, desc:e.target.value})} required/>
                    <label className="file-label">📸 Photo: <input type="file" onChange={e=>setFile(e.target.files[0])} accept="image/*"/></label>
                    <button type="submit" className="btn-add">등록</button>
                </form>
            )}
        </div>
    );
}

// [수정됨] Basic Training(상단) / Offline Quest(하단) 순서 변경
function ThemeList({ themes, username, onSelect, onMyBookings, onLogout }) {
    const offline = Object.values(themes).filter(t => t.category === 'offline');
    const basic = Object.values(themes).filter(t => t.category === 'basic');

    return (
        <div className="screen list-screen">
            <div className="main-header">
                <div className="top-row"><span>Hi, <b>{username}</b></span><div><button onClick={onMyBookings}>My Trips</button><button onClick={onLogout} className="logout">Out</button></div></div>
                <h1>✈️ Quest K</h1>
            </div>

            {/* 1. Basic Training (상단) */}
            <div className="section">
                <h3>📚 Basic Training (AI Tutor)</h3>
                <div className="grid">
                    {basic.map(t => (
                        <div key={t.id} className="card-small" onClick={() => onSelect(t.id)}>
                            <span className="icon">{t.icon}</span><span>{t.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Offline Quests (하단) */}
            <div className="section">
                <h3>✨ Offline Quests (Real Trip)</h3>
                {offline.map(t => (
                    <div key={t.id} className="card-wide" onClick={() => onSelect(t.id)}>
                        <div className="img" style={{backgroundImage: `url(${t.image_url || 'https://via.placeholder.com/400'})`}}></div>
                        <div className="info"><h4>{t.title}</h4><span>{t.price}</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MyBookings({ username, onBack }) {
    const [list, setList] = useState([]);
    useEffect(() => { fetch(`http://localhost:8000/bookings/my?username=${username}`).then(r=>r.json()).then(d=>Array.isArray(d)?setList(d):setList([])); }, [username]);
    return (
        <div className="screen">
            <div className="sub-header"><button onClick={onBack}>←</button><h2>My Trips</h2></div>
            <div className="my-list">{list.length===0?<p className="no-data">Empty</p>:list.map(b=>(<div key={b.id} className="booking-card"><h4>{b.theme_title}</h4><p>📅 {b.start_date}~{b.end_date}</p><span className="badge-confirmed">Confirmed</span></div>))}</div>
        </div>
    );
}

function ProductDetail({ theme, username, onBack, onStartChat }) {
    const [form, setForm] = useState({ start: '', end: '', people: 1 });
    const handleBook = async () => {
        if(!form.start || !form.end) return alert("Date required");
        try {
            const res = await fetch('http://localhost:8000/book', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, theme_id: theme.id, start_date: form.start, end_date: form.end, people: parseInt(form.people) }) });
            if(res.ok) { alert("Booked!"); onBack(); } else alert("Failed");
        } catch { alert("Error"); }
    };
    return (
        <div className="screen detail-screen">
            <button className="nav-back" onClick={onBack}>←</button>
            <div className="hero-img" style={{backgroundImage: `url(${theme.image_url || 'https://via.placeholder.com/400'})`}}></div>
            <div className="detail-body">
                <h1>{theme.title}</h1><p className="price">{theme.price}</p><p className="desc">{theme.desc}</p>
                <div className="book-box">
                    <div className="row"><input type="date" onChange={e=>setForm({...form, start:e.target.value})} /><input type="date" onChange={e=>setForm({...form, end:e.target.value})} /></div>
                    <select onChange={e=>setForm({...form, people:e.target.value})}><option value="1">1</option><option value="2">2</option></select>
                    <button onClick={handleBook}>Book Now</button>
                </div>
                <div className="ai-box"><button onClick={onStartChat}>🦋 Chat with AI</button></div>
            </div>
        </div>
    );
}

function VoiceChat({ theme, onBack }) {
    const [chatLog, setChatLog] = useState([]);
    const [isRec, setIsRec] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const mediaRef = useRef(null);
    const chunksRef = useRef([]);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog, isLoading]);

    const getMimeType = () => {
        if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
        return '';
    };

    const startRec = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mime = getMimeType();
            mediaRef.current = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
            mediaRef.current.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mediaRef.current.onstop = sendAudio;
            mediaRef.current.start(100);
            setIsRec(true);
            chunksRef.current = [];
        } catch { alert("Mic needed"); }
    };

    const stopRec = () => {
        if (mediaRef.current && isRec) {
            setTimeout(() => {
                if (mediaRef.current.state === "recording") mediaRef.current.stop();
                setIsRec(false);
                setIsLoading(true);
            }, 500);
        }
    };

    const sendAudio = async () => {
        const mime = getMimeType() || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 100) { setIsLoading(false); return; }

        const ext = mime.split('/')[1] || 'webm';
        const fd = new FormData();
        fd.append('file', blob, `audio.${ext}`);
        fd.append('theme_id', theme.id);

        try {
            const res = await fetch('http://localhost:8000/talk', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.audio_base64) {
                setChatLog(p => [...p, { role: 'user', text: data.user_text }, { role: 'ai', ...data, audio: `data:audio/mp3;base64,${data.audio_base64}` }]);
            }
        } catch { alert("AI Error"); } finally { setIsLoading(false); }
    };

    return (
        <div className="screen chat-screen">
            <div className="sub-header"><button onClick={onBack}>←</button><h2>{theme.title}</h2></div>
            <div className="chat-body">
                {chatLog.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                        <div className="bubble">
                            {m.role === 'ai' ? (
                                <><div className="sound-badge">{m.phonetic}</div><div className="kor">{m.korean_text}</div><div className="eng">{m.eng_meaning}</div><div className="expl">{m.kor_explanation}</div><audio controls autoPlay src={m.audio} className="audio-player"/></>
                            ) : m.text}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="msg ai"><div className="bubble loading">Thinking... 🧠</div></div>}
                <div ref={chatEndRef} />
            </div>
            <div className="chat-ctrl"><button onMouseDown={startRec} onMouseUp={stopRec} className={isRec ? 'rec' : ''}>{isRec ? 'Listening...' : '🎙️ Hold to Speak'}</button></div>
        </div>
    );
}

export default App;