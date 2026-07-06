import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/Chats.css';
import { mergeChatMessages, messagesShallowEqual } from '../utils/chatMessages';
import ReferencedItemsBar from '../components/ReferencedItemsBar';
import { getChatItemPath, getReferencedItems } from '../utils/chatItemRoutes';
import { getStoredUser } from '../utils/safeStorage';
import { getUnreadCountForUser } from '../utils/unreadCount';
import { fileToOptimizedDataUrl } from '../utils/imageUpload';
import { API_URL } from '../lib/apiUrl';

const API = API_URL;
const POLL_MS = 3000;
const WARN_KEY = "chatExpiryWarned";

const toBase64 = (file) => fileToOptimizedDataUrl(file, { maxWidth: 800 });

export default function Chats() {
    const navigate = useNavigate();
    const token  = localStorage.getItem("token");
    const myUser = getStoredUser({});
    const myId   = myUser._id || myUser.id;
    const baseRoute = myUser?.role === 'supplier' ? '/supplier' : '/store';
    
    

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv]       = useState(null);
    const [messages, setMessages]           = useState([]);
    const [text, setText]                   = useState("");
    const [loading, setLoading]             = useState(true);
    const [sending, setSending]             = useState(false);
    const [showWarning, setShowWarning]     = useState(false);
    const [replyTo, setReplyTo]             = useState(null); // الرسالة المُردّ عليها
    const [imagePreview, setImagePreview]   = useState(null); // صورة مرفقة
    const [imageFile, setImageFile]         = useState(null);

    const messagesEndRef = useRef(null);
    const pollingRef     = useRef(null);
    const activeConvRef  = useRef(null);
    const fileInputRef   = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!localStorage.getItem(WARN_KEY)) setShowWarning(true);
    }, []);

    const dismissWarning = () => {
        localStorage.setItem(WARN_KEY, "1");
        setShowWarning(false);
    };

    // ===== جلب المحادثات =====
    const fetchConversations = useCallback(async () => {
        try {
            const res  = await fetch(`${API}/chats`, { headers });
            const data = await res.json();
            if (res.ok) setConversations(data.conversations || []);
        } catch { }
        finally { setLoading(false); }
    }, []);

    // ===== جلب الرسائل =====
    const fetchMessages = useCallback(async (convId, silent = false) => {
        try {
            const res  = await fetch(`${API}/chats/${convId}`, { headers });
            const data = await res.json();
            if (!res.ok) return;
            setMessages(prev => {
                const merged = mergeChatMessages(data.messages, prev);
                if (messagesShallowEqual(prev, merged)) return prev;
                if (!silent) scrollToBottom();
                return merged;
            });
        } catch { }
    }, []);

    // ===== Polling =====
    const startPolling = useCallback((convId) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => {
            if (activeConvRef.current?._id === convId) {
                fetchMessages(convId, true);
                fetchConversations();
            }
        }, POLL_MS);
    }, [fetchMessages, fetchConversations]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchConversations();
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    // ===== فتح محادثة =====
    const openConversation = (conv) => {
        setActiveConv(conv);
        setMessages([]);
        setReplyTo(null);
        setImagePreview(null);
        setImageFile(null);
        fetchMessages(conv._id);
        startPolling(conv._id);
    };

    // ===== context من صفحة المنتج =====
    useEffect(() => {
        const ctx = localStorage.getItem("chatContext");
        if (!ctx) return;
        const parsed = JSON.parse(ctx);
        localStorage.removeItem("chatContext");

        (async () => {
            try {
                const res  = await fetch(`${API}/chats`, {
                    method: "POST", headers,
                    body: JSON.stringify({
                        recipientId: parsed.storeOwnerId,
                        context: {
                            itemId:    parsed.productId || parsed.context?.itemId,
                            itemType:  parsed.itemType || parsed.context?.itemType || "Product",
                            itemName:  parsed.productName || parsed.context?.itemName,
                            itemImage: parsed.productImg || parsed.context?.itemImage,
                        },
                    }),
                });
                const data = await res.json();
                if (!res.ok) return;
                openConversation(data.conversation);
                fetchConversations();
                if (parsed.prefillText) {
    // جاء من صفحة الطلبات — نضع نص الطلب مباشرة
                  setTimeout(() => setText(parsed.prefillText), 400);
              } else if (parsed.productName) {
                  // جاء من صفحة المنتج — نضع رسالة الاهتمام
                  setTimeout(() => setText(
                      `مرحباً، أنا مهتم بـ: ${parsed.productName} — ${parsed.productPrice} ₪`
                  ), 400);
              }
            } catch { }
        })();
    }, []);

    // ===== اختيار صورة =====
    const handleImageSelect = async (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024)
            return alert("الصورة أكبر من 5MB");
        const base64 = await toBase64(file);
        setImageFile(base64);
        setImagePreview(base64);
    };

    // ===== إرسال رسالة =====
    const sendMessage = async () => {
        if ((!text.trim() && !imageFile) || !activeConv || sending) return;
        setSending(true);

        const optimistic = {
            // eslint-disable-next-line react-hooks/purity
            _id:       "tmp-" + Date.now(),
            clientKey: "c-" + Date.now(),
            sender:    { _id: myId },
            text:      text.trim(),
            image:     imageFile || null,
            replyTo:   replyTo || null,
            createdAt: new Date(),
            read:      false,
        };

        setMessages(prev => [...prev, optimistic]);
        const sentText  = text.trim();
        const sentImage = imageFile;
        const sentReply = replyTo;
        setText("");
        setImagePreview(null);
        setImageFile(null);
        setReplyTo(null);
        scrollToBottom();

        try {
            const res  = await fetch(`${API}/chats/${activeConv._id}`, {
                method: "POST", headers,
                body: JSON.stringify({
                    text:    sentText,
                    image:   sentImage,
                    replyTo: sentReply ? {
                        messageId:  sentReply._id,
                        text:       sentReply.text,
                        senderName: sentReply.sender?.name || "مستخدم",
                    } : null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessages(prev => prev.map(m =>
                m._id === optimistic._id
                    ? { ...data.message, clientKey: optimistic.clientKey }
                    : m
            ));
            fetchConversations();
        } catch (err) {
            setMessages(prev => prev.filter(m => m._id !== optimistic._id));
            setText(sentText);
            setImageFile(sentImage);
            setReplyTo(sentReply);
            alert("خطأ: " + err.message);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () =>
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

    const getOther = (conv) =>
        conv.participants?.find(p => {
            const pid = p._id?.toString() || p?.toString();
            return pid !== myId?.toString();
        }) || conv.participants?.[0];

    const getInitial = (name) => name?.charAt(0) || "؟";

    const formatTime = (date) => {
        if (!date) return "";
        const d    = new Date(date);
        // eslint-disable-next-line react-hooks/purity
        const diff = Date.now() - d;
        if (diff < 86400000)  return d.toLocaleTimeString("ar-EG", { hour:"2-digit", minute:"2-digit" });
        if (diff < 172800000) return "أمس";
        return d.toLocaleDateString("ar-EG");
    };

    const openItemInStore = (item) => {
        const path = getChatItemPath(item, { role: 'store', baseRoute });
        if (path) navigate(path);
        else alert('لا يمكن فتح هذا العنصر من لوحة المتجر');
    };

    const referencedItems = activeConv ? getReferencedItems(activeConv) : [];

    return (
        <div className="chats-page">
            {/* تنبيه الحذف */}
            {showWarning && (
                <div style={{
                    position:"fixed", top:"80px", left:"50%", transform:"translateX(-50%)",
                    background:"#1e293b", color:"#fff", padding:"1rem 1.5rem",
                    borderRadius:"12px", zIndex:9999, maxWidth:"380px", width:"90%",
                    boxShadow:"0 8px 24px rgba(0,0,0,0.3)", direction:"rtl",
                }}>
                    <div style={{ display:"flex", gap:"0.75rem", alignItems:"flex-start" }}>
                        <span style={{ fontSize:"1.5rem" }}>⏳</span>
                        <div>
                            <p style={{ margin:"0 0 0.4rem", fontWeight:"bold" }}>تنبيه: الرسائل تُحذف تلقائياً</p>
                            <p style={{ margin:0, fontSize:"0.82rem", opacity:0.85, lineHeight:1.5 }}>
                                تُحذف الرسائل بعد <strong>4 أيام</strong> من إرسالها لتخفيف التخزين.
                            </p>
                        </div>
                    </div>
                    <button onClick={dismissWarning} style={{
                        marginTop:"0.75rem", width:"100%", padding:"0.5rem",
                        background:"#667eea", color:"#fff", border:"none",
                        borderRadius:"8px", cursor:"pointer", fontWeight:"bold",
                    }}>فهمت ✓</button>
                </div>
            )}

            {/* inputs مخفية للصور */}
            <input ref={fileInputRef} type="file" accept="image/*"
                style={{ display:"none" }}
                onChange={e => handleImageSelect(e.target.files[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                style={{ display:"none" }}
                onChange={e => handleImageSelect(e.target.files[0])} />

            <div className="messenger-container">
                {/* Sidebar */}
                <div className="chats-sidebar">
                    <div className="sidebar-header">
                        <h3>💬 الرسائل</h3>
                        <span style={{ fontSize:"0.8rem", color:"var(--text-secondary)" }}>
                            {conversations.length} محادثة
                        </span>
                    </div>
                    <div className="chats-list">
                        {conversations.length === 0 ? (
                            <div style={{ padding:"2rem", textAlign:"center", color:"var(--text-secondary)" }}>
                                <p style={{ fontSize:"2rem" }}>💬</p>
                                <p>لا توجد محادثات بعد</p>
                            </div>
                        ) : conversations.map(conv => {
                            const other      = getOther(conv);
                            const unread     = getUnreadCountForUser(conv.unreadCount, myId);
                            const isActive   = activeConv?._id === conv._id;
                            const lastMsgTxt = conv.lastMessage?.image
                                ? "📷 صورة"
                                : conv.lastMessage?.text || "ابدأ المحادثة";

                            return (
                                <div key={conv._id}
                                    className={`chat-item ${isActive ? "active" : ""}`}
                                    onClick={() => openConversation(conv)}
                                >
                                    <div className="chat-avatar">
                                        {getInitial(other?.name)}
                                        {unread > 0 && <span className="online-dot" />}
                                    </div>
                                    <div className="chat-info">
                                        <h4>{other?.name || "مستخدم"}</h4>
                                        <p style={{
                                            overflow:"hidden", whiteSpace:"nowrap",
                                            textOverflow:"ellipsis", maxWidth:"140px", fontSize:"0.82rem",
                                        }}>
                                            {lastMsgTxt}
                                        </p>
                                    </div>
                                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                                        <span className="chat-time">{formatTime(conv.updatedAt)}</span>
                                        {unread > 0 && (
                                            <span style={{
                                                background:"#ef4444", color:"#fff", borderRadius:"50%",
                                                width:"18px", height:"18px", fontSize:"0.7rem",
                                                display:"flex", alignItems:"center", justifyContent:"center",
                                                fontWeight:"bold",
                                            }}>
                                                {unread > 9 ? "9+" : unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Chat Window */}
                {!activeConv ? (
                    <div className="chat-window" style={{
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexDirection:"column", gap:"1rem", color:"var(--text-secondary)",
                    }}>
                        <div style={{ fontSize:"4rem" }}>💬</div>
                        <p>اختر محادثة للبدء</p>
                    </div>
                ) : (
                    <div className="chat-window">
                        {/* Header */}
                        <div className="window-header">
                            <div className="user-details">
                                <div className="chat-avatar" style={{ cursor:"default" }}>
                                    {getInitial(getOther(activeConv)?.name)}
                                </div>
                                <div>
                                    <h4 style={{ margin:0 }}>{getOther(activeConv)?.name || "مستخدم"}</h4>
                                    <span style={{ fontSize:"0.72rem", color:"var(--text-secondary)" }}>
                                        ⏳ الرسائل تُحذف بعد 4 أيام
                                    </span>
                                </div>
                            </div>
                            <div className="header-links">
                                <button className="mini-wa" onClick={() => {
                                    const other = getOther(activeConv);
                                    const phone = other?.phone || other?.whatsapp;
                                    if (!phone) return alert("رقم الواتساب غير متاح");
                                    window.open(`https://wa.me/${phone.replace(/\D/g,"")}`, "_blank");
                                }}>📱 واتساب</button>
                            </div>
                        </div>

                        <ReferencedItemsBar items={referencedItems} onItemClick={openItemInStore} />

                        {/* الرسائل */}
                        <div className="chat-messages">
                            {messages.length === 0 && (
                                <div style={{ textAlign:"center", color:"var(--text-secondary)", padding:"2rem" }}>
                                    ابدأ المحادثة الآن 👋
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const senderId = msg.sender?._id || msg.sender;
                                const isMine   = senderId?.toString() === myId?.toString();
                                return (
                                    <div key={msg.clientKey || msg._id || i}
                                        className={`msg ${isMine ? "sent" : "received"}`}
                                        onDoubleClick={() => setReplyTo(msg)} // دبل كليك للرد
                                        title="انقر مرتين للرد"
                                    >
                                        {/* التعليق على رسالة */}
                                        {msg.replyTo?.text && (
                                            <div style={{
                                                borderRight:"3px solid rgba(255,255,255,0.5)",
                                                paddingRight:"8px", marginBottom:"6px",
                                                fontSize:"0.75rem", opacity:0.8,
                                                background:"rgba(0,0,0,0.1)",
                                                borderRadius:"4px", padding:"4px 8px",
                                            }}>
                                                <span style={{ fontWeight:"bold" }}>
                                                    {msg.replyTo.senderName}:
                                                </span> {msg.replyTo.text}
                                            </div>
                                        )}

                                        {/* الصورة */}
                                        {msg.image && (
                                            <img src={msg.image} alt="صورة"
                                                style={{
                                                    maxWidth:"220px", borderRadius:"8px",
                                                    display:"block", marginBottom: msg.text ? "6px" : 0,
                                                    cursor:"pointer",
                                                }}
                                                onClick={() => window.open(msg.image, "_blank")}
                                            />
                                        )}

                                        {/* النص */}
                                        {msg.text && (
                                            <p style={{ margin:0, whiteSpace:"pre-wrap" }}>{msg.text}</p>
                                        )}

                                        <span style={{
                                            fontSize:"0.65rem", opacity:0.6, display:"block",
                                            marginTop:"3px", textAlign: isMine ? "left" : "right",
                                        }}>
                                            {formatTime(msg.createdAt)}
                                            {isMine && (msg.read ? " ✓✓" : " ✓")}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* منطقة الرد على رسالة */}
                        {replyTo && (
                            <div style={{
                                padding:"0.5rem 1rem", background:"rgba(102,126,234,0.08)",
                                borderTop:"1px solid var(--border)",
                                display:"flex", alignItems:"center", justifyContent:"space-between",
                                direction:"rtl",
                            }}>
                                <div style={{ fontSize:"0.82rem" }}>
                                    <span style={{ color:"#667eea", fontWeight:"bold" }}>
                                        رداً على: {replyTo.sender?.name || "مستخدم"}
                                    </span>
                                    <p style={{ margin:"2px 0 0", opacity:0.7, whiteSpace:"nowrap",
                                        overflow:"hidden", textOverflow:"ellipsis", maxWidth:"250px" }}>
                                        {replyTo.image ? "📷 صورة" : replyTo.text}
                                    </p>
                                </div>
                                <button onClick={() => setReplyTo(null)} style={{
                                    background:"none", border:"none", cursor:"pointer",
                                    fontSize:"1.2rem", color:"var(--text-secondary)",
                                }}>✕</button>
                            </div>
                        )}

                        {/* معاينة الصورة المرفقة */}
                        {imagePreview && (
                            <div style={{
                                padding:"0.5rem 1rem", borderTop:"1px solid var(--border)",
                                display:"flex", alignItems:"center", gap:"0.75rem",
                            }}>
                                <img src={imagePreview} alt="معاينة"
                                    style={{ width:"60px", height:"60px", borderRadius:"8px", objectFit:"cover" }} />
                                <span style={{ fontSize:"0.82rem", color:"var(--text-secondary)" }}>صورة مرفقة</span>
                                <button onClick={() => { setImagePreview(null); setImageFile(null); }}
                                    style={{ background:"none", border:"none", cursor:"pointer",
                                        fontSize:"1.2rem", color:"#ef4444", marginRight:"auto" }}>✕</button>
                            </div>
                        )}

                        {/* Input */}
                        <div className="chat-input-area">
                            {/* زر الكاميرا */}
                            <button onClick={() => cameraInputRef.current?.click()}
                                title="التقاط صورة"
                                style={{
                                    background:"none", border:"none", cursor:"pointer",
                                    fontSize:"1.3rem", padding:"0 4px", color:"var(--text-secondary)",
                                }}>📷</button>

                            {/* زر اختيار صورة */}
                            <button onClick={() => fileInputRef.current?.click()}
                                title="إرفاق صورة"
                                style={{
                                    background:"none", border:"none", cursor:"pointer",
                                    fontSize:"1.3rem", padding:"0 4px", color:"var(--text-secondary)",
                                }}>🖼️</button>

                            <input
                                type="text"
                                placeholder="اكتب رسالتك... (Enter للإرسال)"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                disabled={sending}
                                autoFocus
                            />
                            <button className="send-msg-btn" onClick={sendMessage}
                                disabled={sending || (!text.trim() && !imageFile)}>
                                {sending ? "⏳" : "إرسال ←"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}