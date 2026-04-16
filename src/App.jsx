import { useState, useRef, useEffect } from 'react'

// 🟢 LOCAL SERVER LINKS
const API_BASE = "http://127.0.0.1:8000"
const WS_BASE = "ws://127.0.0.1:8000/ws"

export default function App() {
  // === INTRO ANIMATION STATE ===
  const [showIntro, setShowIntro] = useState(true)

  // === AUTHENTICATION STATES ===
  const [authMode, setAuthMode] = useState('login') 
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  
  // === SYSTEM STATES ===
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState('')
  const [activeTab, setActiveTab] = useState('chat') 

  // === CHAT STATES ===
  const [targetUser, setTargetUser] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])
  const [selectedChatFile, setSelectedChatFile] = useState(null)
  
  // === STEGANOGRAPHY STATES ===
  const [mediaType, setMediaType] = useState('image') 
  const [stegoFile, setStegoFile] = useState(null)
  const [stegoMessage, setStegoMessage] = useState('')
  const [stegoPassword, setStegoPassword] = useState('')
  const [stegoResult, setStegoResult] = useState(null)
  const [stegoLoading, setStegoLoading] = useState(false)

  const ws = useRef(null)
  const messagesEndRef = useRef(null)

  // Intro Animation Timer (3 Seconds)
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => { 
    if(activeTab === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, activeTab])

  // ==========================================
  // 1. AUTHENTICATION LOGIC
  // ==========================================
  const switchMode = (mode) => {
    setAuthMode(mode)
    setOtpSent(false)
    setStatusMsg('')
    setOtp('')
    setPassword('')
  }

  const requestOtp = async (e) => {
    e.preventDefault()
    if(!email) return alert("Enter your Email address first!")
    setStatusMsg("Sending OTP... ⏳")
    let formData = new FormData()
    formData.append("email", email)
    try {
      let res = await fetch(API_BASE + "/request-otp/", { method: "POST", body: formData })
      let data = await res.json()
      if(res.ok) {
        setOtpSent(true)
        setStatusMsg("✅ OTP sent successfully!")
      } else {
        setStatusMsg("❌ Error: " + data.detail)
      }
    } catch (err) {
      setStatusMsg("❌ Failed to connect to server!")
    }
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setStatusMsg("Processing... ⏳")
    let formData = new FormData()
    let endpoint = ""
    if (authMode === 'login') {
      formData.append("email", email)
      formData.append("password", password)
      endpoint = "/login/"
    } else if (authMode === 'signup') {
      formData.append("username", username); formData.append("email", email);
      formData.append("password", password); formData.append("otp", otp);
      endpoint = "/signup-with-otp/"
    } else if (authMode === 'forgot') {
      formData.append("email", email); formData.append("new_password", password);
      formData.append("otp", otp);
      endpoint = "/reset-password/"
    }
    try {
      let res = await fetch(API_BASE + endpoint, { method: "POST", body: formData })
      let data = await res.json()
      if(res.ok) {
        setStatusMsg("🎉 " + data.message)
        if (authMode === 'forgot') {
          setTimeout(() => switchMode('login'), 2000)
        } else {
          setCurrentUser(data.username)
          setTimeout(() => {
            setIsLoggedIn(true)
            connectWebSocket(data.username)
          }, 1000)
        }
      } else {
        setStatusMsg("❌ Error: " + data.detail)
      }
    } catch (err) {
      setStatusMsg("❌ Server error!")
    }
  }

  // ==========================================
  // 2. LIVE CHAT ENGINE
  // ==========================================
  const connectWebSocket = (user) => {
    if (ws.current) ws.current.close()
    ws.current = new WebSocket(WS_BASE + "/" + user)
    ws.current.onmessage = (event) => setMessages(prev => [...prev, event.data])
    ws.current.onclose = () => setMessages(prev => [...prev, "[SYSTEM]🔴 Connection closed. You are offline."])
  }

  const sendMessage = () => {
    if (!targetUser) return alert("Enter the recipient's username first!")
    if (!messageInput.trim()) return
    ws.current.send(targetUser + "|text|" + messageInput)
    setMessageInput('')
  }

  const sendChatFile = async () => {
    if (!targetUser) return alert("Enter the recipient's username first!")
    if (!selectedChatFile) return alert("Select a media file first!")
    let formData = new FormData()
    formData.append("file", selectedChatFile)
    setStatusMsg("Uploading file to local storage... ⏳")
    try {
      let res = await fetch(API_BASE + "/upload-chat-media/", { method: "POST", body: formData })
      let data = await res.json()
      if(res.ok) {
        ws.current.send(targetUser + "|" + data.type + "|" + data.filename)
        setSelectedChatFile(null)
        setStatusMsg("")
        document.getElementById('chatFileInput').value = ''
      }
    } catch (err) {
      setStatusMsg("❌ File upload failed!")
    }
  }

  const logout = () => {
    if(ws.current) ws.current.close()
    setIsLoggedIn(false)
    setMessages([])
    setCurrentUser('')
    setActiveTab('chat')
    switchMode('login')
  }

  // ==========================================
  // 3. STEGANOGRAPHY ENGINE
  // ==========================================
  const handleEncrypt = async (e) => {
    e.preventDefault()
    if(!stegoFile) return alert("Please select a cover file!")
    setStegoLoading(true)
    setStegoResult(null)
    let formData = new FormData()
    formData.append("secret_message", stegoMessage)
    formData.append("password", stegoPassword)
    formData.append("file", stegoFile)
    try {
      let res = await fetch(API_BASE + "/hide-in-" + mediaType + "/", { method: "POST", body: formData })
      let data = await res.json()
      if(res.ok) {
        let fileName = data["stego_" + mediaType + "_path"].split("\\").pop().split("/").pop()
        setStegoResult({ 
            type: 'success', 
            msg: 'File encrypted successfully!', 
            link: API_BASE + "/media/encrypted_files/" + fileName 
        })
      } else {
        setStegoResult({ type: 'error', msg: data.detail })
      }
    } catch(err) {
      setStegoResult({ type: 'error', msg: "Encryption failed! Please check the server." })
    }
    setStegoLoading(false)
  }

  const handleDecrypt = async (e) => {
    e.preventDefault()
    if(!stegoFile) return alert("Please select an encrypted file!")
    setStegoLoading(true)
    setStegoResult(null)
    let formData = new FormData()
    formData.append("password", stegoPassword)
    formData.append("file", stegoFile)
    try {
      let res = await fetch(API_BASE + "/extract-from-" + mediaType + "/", { method: "POST", body: formData })
      let data = await res.json()
      if(res.ok) {
        setStegoResult({ type: 'success', msg: "Secret Message: " + data.your_secret_message })
      } else {
        setStegoResult({ type: 'error', msg: "Extraction failed! Password is incorrect or the file is invalid." })
      }
    } catch(err) {
      setStegoResult({ type: 'error', msg: "Decryption failed! Server error." })
    }
    setStegoLoading(false)
  }

  // ==========================================
  // 🚀 RENDER 0: HIGH-TECH INTRO ANIMATION
  // ==========================================
  if (showIntro) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a] overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="relative text-center z-10">
          {/* Logo with Shimmer/Pulse */}
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 animate-pulse">
            OmniHide
          </h1>

          {/* Progress Bar Container */}
          <div className="mt-8 h-1.5 w-64 bg-white/5 mx-auto rounded-full overflow-hidden border border-white/5 shadow-inner">
             {/* The Actual Moving Bar */}
             <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 animate-load-progress"></div>
          </div>

          {/* Status Text */}
          <p className="mt-6 text-blue-300 font-mono font-semibold tracking-[0.3em] uppercase text-sm animate-pulse shadow-blue-500/50 drop-shadow-md">
            Establishing Secure Link...
          </p>
        </div>
      </div>
    )
  }
  // ==========================================
  // RENDER 1: AUTHENTICATION SCREEN
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-[#0a0a0c]">
        <div className="relative p-8 w-full max-w-md rounded-2xl shadow-2xl backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse"></div>
          
          <div className="relative z-10 text-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">OmniHide</h1>
            <p className="text-gray-400 mb-6 font-medium text-sm">
              {authMode === 'login' && "Agent Login Portal"}
              {authMode === 'signup' && "Register Secret Identity"}
              {authMode === 'forgot' && "Reset Security Key"}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
              {authMode === 'login' && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Email</label>
                    <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required 
                      className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-blue-400" placeholder="agent@secret.com"/>
                  </div>
                  <div>
                    <div className="flex justify-between mt-1">
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Password</label>
                      <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-blue-400 hover:text-blue-300">Forgot Password?</button>
                    </div>
                    <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required 
                      className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-blue-400" placeholder="••••••••"/>
                  </div>
                  <button type="submit" className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg transform transition active:scale-95">
                    Login
                  </button>
                  <p className="text-center mt-4 text-sm text-gray-400">
                    New Agent? <button type="button" onClick={() => switchMode('signup')} className="text-blue-400 hover:underline">Sign up</button>
                  </p>
                </>
              )}

              {(authMode === 'signup' || authMode === 'forgot') && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-bold">Email</label>
                    <div className="flex gap-2 mt-1">
                      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required 
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-blue-400" placeholder="agent@secret.com"/>
                      <button type="button" onClick={requestOtp} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-lg text-xs">Get OTP</button>
                    </div>
                  </div>
                  {otpSent && (
                    <div className="space-y-4 mt-4 animate-fade-in">
                      <input type="text" value={otp} onChange={(e)=>setOtp(e.target.value)} required maxLength="4"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white text-center tracking-widest text-lg outline-none focus:border-blue-400" placeholder="OTP"/>
                      {authMode === 'signup' && (
                        <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} required 
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-blue-400" placeholder="Username"/>
                      )}
                      <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required 
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-blue-400" placeholder="New Password"/>
                      <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-lg active:scale-95">
                        Confirm
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => switchMode('login')} className="w-full text-center mt-4 text-sm text-blue-400 hover:underline">Back to Login</button>
                </>
              )}
            </form>
            {statusMsg && <p className="mt-4 text-xs font-semibold text-yellow-300">{statusMsg}</p>}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER 2: DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0a0a0c] p-4 flex flex-col items-center">
      <div className="w-full max-w-5xl flex justify-between items-center bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl mb-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">OmniHide</h1>
          <p className="text-gray-400 text-xs">Agent: <span className="text-green-400 font-bold">{currentUser}</span> 🟢</p>
        </div>
        <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg font-bold text-sm transition">Logout</button>
      </div>

      <div className="w-full max-w-5xl flex gap-2 mb-4">
        {['chat', 'encrypt', 'decrypt'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-bold rounded-xl capitalize transition ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="w-full max-w-5xl bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ height: '70vh' }}>
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full w-full">
            <div className="bg-white/5 p-3 border-b border-white/10 flex items-center gap-4">
              <input type="text" value={targetUser} onChange={(e)=>setTargetUser(e.target.value)} className="flex-grow bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-purple-400 text-sm" placeholder="Recipient Username..." />
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-3">
              {messages.map((msg, idx) => {
                if (msg.startsWith("🟢") || msg.startsWith("🔴") || msg.startsWith("[SYSTEM]")) {
                  return <div key={idx} className="text-center text-[10px] text-gray-500 my-1 italic">{msg.replace("[SYSTEM]", "")}</div>
                }
                let isMine = msg.startsWith("[SENT]");
                let cleanMsg = msg.replace("[PRIVATE]", "").replace("[SENT]", "");
                let [user, type, content] = cleanMsg.split("|");
                return (
                  <div key={idx} className={isMine ? "flex flex-col max-w-[80%] ml-auto items-end" : "flex flex-col max-w-[80%] mr-auto items-start"}>
                    <div className="text-[10px] text-gray-500 mb-1">{isMine ? "To: " + user : "From: " + user}</div>
                    <div className={`p-3 rounded-2xl text-white text-sm shadow-md ${isMine ? "bg-blue-600 rounded-tr-none" : "bg-gray-800 rounded-tl-none"}`}>
                      {type === 'text' && <p>{content}</p>}
                      {type === 'image' && <img src={API_BASE + "/media/chat_files/" + content} alt="chat" className="max-w-xs rounded-lg"/>}
                      {type === 'video' && <video src={API_BASE + "/media/chat_files/" + content} controls className="max-w-xs rounded-lg"></video>}
                      {type === 'audio' && <audio src={API_BASE + "/media/chat_files/" + content} controls className="mt-1"></audio>}
                      {type === 'file' && <a href={API_BASE + "/media/chat_files/" + content} target="_blank" rel="noreferrer" className="text-blue-300 underline font-bold">📎 Download File</a>}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="bg-white/5 p-4 border-t border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input type="file" id="chatFileInput" onChange={(e) => setSelectedChatFile(e.target.files[0])} className="text-[10px] text-gray-400 file:bg-blue-500/20 file:text-blue-400 file:border-0 file:rounded file:px-2 file:py-1"/>
                <button onClick={sendChatFile} disabled={!selectedChatFile} className="bg-blue-600/20 text-blue-400 text-[10px] px-3 py-1 rounded border border-blue-500/50">Send Media</button>
              </div>
              <div className="flex gap-2">
                <input type="text" value={messageInput} onChange={(e)=>setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-grow bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm outline-none" placeholder="Type a message..." />
                <button onClick={sendMessage} className="bg-blue-600 px-6 rounded-lg text-sm font-bold active:scale-95 transition">Send</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'encrypt' && (
          <div className="p-8 overflow-y-auto w-full h-full">
            <h2 className="text-xl font-bold text-blue-400 mb-6">Lock Data into Media</h2>
            <div className="flex gap-2 mb-6">
              {['image', 'audio', 'video'].map(type => (
                <button key={type} onClick={() => setMediaType(type)} className={`px-4 py-1 rounded-full text-xs font-bold ${mediaType === type ? 'bg-blue-600' : 'bg-white/5 text-gray-400'}`}>{type.toUpperCase()}</button>
              ))}
            </div>
            <form onSubmit={handleEncrypt} className="space-y-4 max-w-md">
              <input type="file" required accept={mediaType + "/*"} onChange={(e)=>setStegoFile(e.target.files[0])} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white"/>
              <textarea required value={stegoMessage} onChange={(e)=>setStegoMessage(e.target.value)} rows="3" className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white outline-none" placeholder="Secret message..."/>
              <input type="password" required value={stegoPassword} onChange={(e)=>setStegoPassword(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white" placeholder="Encryption Password"/>
              <button type="submit" disabled={stegoLoading} className="w-full bg-blue-600 py-3 rounded-lg font-bold disabled:bg-gray-700">{stegoLoading ? "Processing..." : "Encrypt & Save"}</button>
            </form>
            {stegoResult && (
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-blue-300 text-sm">{stegoResult.msg}</p>
                <a href={stegoResult.link} target="_blank" rel="noreferrer" className="text-white underline text-xs mt-2 block">Download Locked {mediaType}</a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'decrypt' && (
          <div className="p-8 overflow-y-auto w-full h-full text-left">
            <h2 className="text-xl font-bold text-green-400 mb-6">Extract Secret Data</h2>
            <div className="flex gap-2 mb-6 text-left">
              {['image', 'audio', 'video'].map(type => (
                <button key={type} onClick={() => setMediaType(type)} className={`px-4 py-1 rounded-full text-xs font-bold ${mediaType === type ? 'bg-green-600' : 'bg-white/5 text-gray-400'}`}>{type.toUpperCase()}</button>
              ))}
            </div>
            <form onSubmit={handleDecrypt} className="space-y-4 max-w-md">
              <input type="file" required accept={mediaType + "/*"} onChange={(e)=>setStegoFile(e.target.files[0])} className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white"/>
              <input type="password" required value={stegoPassword} onChange={(e)=>setStegoPassword(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white" placeholder="Decryption Password"/>
              <button type="submit" disabled={stegoLoading} className="w-full bg-green-600 py-3 rounded-lg font-bold disabled:bg-gray-700">{stegoLoading ? "Extracting..." : "Decrypt Message"}</button>
            </form>
            {stegoResult && <div className="mt-4 p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-green-200 font-mono text-sm">{stegoResult.msg}</div>}
          </div>
        )}
      </div>
    </div>
  )
}