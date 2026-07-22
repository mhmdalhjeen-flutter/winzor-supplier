import { useEffect, useRef, useState, useCallback } from "react";
import { Headphones, Mail, Clock, Send, MessageCircle, Shield } from "lucide-react";
import api from "../services/api";
import { API_URL } from "../lib/apiUrl";
import { getStoredUser } from "../utils/safeStorage";
import "../styles/dashboard.css";
import "../styles/Support.css";

const POLL_MS = 4000;

export default function Support() {
  const user = getStoredUser({});
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const [admin, setAdmin] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const fetchMessages = useCallback(async (convId, silent = false) => {
    try {
      const res = await fetch(`${API_URL}/chats/${convId}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        if (!silent) scrollToBottom();
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/users/me/admin-contact");
        if (!mounted) return;
        setAdmin(data);

        const res = await fetch(`${API_URL}/chats`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            recipientId: data.adminId,
            context: {
              itemType: "Support",
              itemName: "الدعم الفني",
            },
          }),
        });
        const chatData = await res.json();
        if (!res.ok) throw new Error(chatData.message || "تعذّر فتح المحادثة");
        setConversation(chatData.conversation);
        await fetchMessages(chatData.conversation._id);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "تعذّر الاتصال بالدعم");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversation?._id) return undefined;
    pollingRef.current = setInterval(() => {
      fetchMessages(conversation._id, true);
    }, POLL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversation?._id, fetchMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !conversation || sending) return;

    setSending(true);
    const prefix = subject.trim() ? `[${subject.trim()}] ` : "";
    const fullText = `${prefix}${body}`;

    try {
      const res = await fetch(`${API_URL}/chats/${conversation._id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: fullText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessages((prev) => [...prev, data.message]);
      setText("");
      setSubject("");
      scrollToBottom();
    } catch (err) {
      setError(err.message || "تعذّر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const myId = user._id || user.id;

  return (
    <div className="support-page-v2">
      <header className="support-hero">
        <div className="support-hero__icon">
          <Headphones size={28} strokeWidth={2} />
        </div>
        <div>
          <h2 className="title support-hero__title">الدعم الفني</h2>
          <p className="support-hero__lead">تواصل مباشرة مع فريق الإدارة — رسائلك تصل فوراً</p>
        </div>
      </header>

      <div className="support-layout">
        <aside className="support-info-panel">
          <div className="support-info-card">
            <Mail size={20} />
            <div>
              <strong>البريد</strong>
              <span>support@offers-tech.com</span>
            </div>
          </div>
          <div className="support-info-card">
            <Clock size={20} />
            <div>
              <strong>ساعات العمل</strong>
              <span>السبت – الخميس · 8ص – 8م</span>
            </div>
          </div>
          <div className="support-info-card support-info-card--accent">
            <Shield size={20} />
            <div>
              <strong>محادثة مباشرة</strong>
              <span>{admin?.adminName ? `مع ${admin.adminName}` : "مع الإدارة"}</span>
            </div>
          </div>
        </aside>

        <section className="support-chat-panel">
          <div className="support-chat-head">
            <MessageCircle size={20} />
            <span>محادثة الدعم</span>
          </div>

          {loading && (
            <div className="support-loading support-loading--skeleton">
              <div className="support-skeleton-bubble" />
              <div className="support-skeleton-bubble support-skeleton-bubble--short" />
              <p>جاري تحميل المحادثة...</p>
            </div>
          )}
          {error && !loading && <p className="support-error">{error}</p>}

          {!loading && !error && (
            <>
              <div className="support-messages">
                {messages.length === 0 ? (
                  <div className="support-messages-empty">
                    <MessageCircle size={36} strokeWidth={1.5} />
                    <p>ابدأ محادثة مع فريق الدعم</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const senderId = msg.sender?._id || msg.sender;
                    const isMine = senderId?.toString() === myId?.toString();
                    return (
                      <div key={msg._id} className={`support-bubble${isMine ? " support-bubble--mine" : ""}`}>
                        <p>{msg.text}</p>
                        <time>{new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</time>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="support-compose" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="موضوع (اختياري)"
                  className="support-compose__subject"
                />
                <div className="support-compose__row">
                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="اكتب رسالتك للإدارة..."
                    required
                  />
                  <button type="submit" className="support-send-btn" disabled={sending || !text.trim()}>
                    <Send size={18} />
                    {sending ? "..." : "إرسال"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
