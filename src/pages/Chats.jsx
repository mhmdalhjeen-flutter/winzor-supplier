import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Camera, ChevronRight, Check, CheckCheck,
  MessageCircle, X, Paperclip,
} from 'lucide-react';
import '../styles/Chats.css';
import { mergeChatMessages, messagesShallowEqual } from '../utils/chatMessages';
import {
  getChatItemPath,
  getReferencedItems,
  buildChatTimeline,
  itemTypeIcon,
} from '../utils/chatItemRoutes';
import { getStoredUser } from '../utils/safeStorage';
import { getUnreadCountForUser } from '../utils/unreadCount';
import { uploadImage } from '../utils/imageUpload';
import { API_URL } from '../lib/apiUrl';

const API = API_URL;
const POLL_MS = 3000;
const WARN_KEY = 'chatExpiryWarned';
const MAX_INPUT_LINES = 3;

const ITEM_TYPE_LABEL = {
  Product: 'منتج',
  Offer: 'عرض',
  BazaarListing: 'إعلان في السوق',
  Support: 'دعم',
};

function getItemTypeLabel(type) {
  return ITEM_TYPE_LABEL[type] || 'عنصر';
}

function SharedItemCard({ item, onClick }) {
  const typeLabel = getItemTypeLabel(item.itemType);

  return (
    <div className="msg msg--shared-item msg--animate received">
      <button type="button" className="shared-item-card" onClick={() => onClick(item)}>
        {item.itemImage ? (
          <img src={item.itemImage} alt="" className="shared-item-card__media" />
        ) : (
          <span className="shared-item-card__media shared-item-card__media--fallback" aria-hidden>
            {itemTypeIcon(item.itemType)}
          </span>
        )}
        <div className="shared-item-card__body">
          <h5 className="shared-item-card__title">{item.itemName || typeLabel}</h5>
          <p className="shared-item-card__desc">{typeLabel} · اضغط لعرض التفاصيل</p>
        </div>
      </button>
    </div>
  );
}

function isMessageSenderMine(sender, myId) {
  const senderId = sender?._id || sender;
  return String(senderId) === String(myId) && !!myId;
}

function ChatListPreview({ conv, myId, unread }) {
  const lastMsg = conv.lastMessage;
  const previewText = (lastMsg?.image || lastMsg?.hasImage)
    ? '📷 صورة'
    : lastMsg?.text || 'ابدأ المحادثة';
  const isMine = lastMsg && isMessageSenderMine(lastMsg.sender, myId);

  return (
    <div className="chat-preview-row">
      {isMine && (
        <span className={`chat-preview-status${lastMsg.read ? ' is-read' : ''}`} aria-hidden>
          {lastMsg.read ? <CheckCheck size={15} strokeWidth={2.5} /> : <Check size={15} strokeWidth={2.5} />}
        </span>
      )}
      <p className={unread > 0 ? 'chat-preview-unread' : ''}>{previewText}</p>
    </div>
  );
}

function useAutoResizeTextarea(value, maxLines = MAX_INPUT_LINES) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resize = () => {
      el.style.height = 'auto';
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || 22;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const borderTop = parseFloat(style.borderTopWidth) || 0;
      const borderBottom = parseFloat(style.borderBottomWidth) || 0;
      const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom + borderTop + borderBottom;
      const nextHeight = Math.min(el.scrollHeight, maxHeight);

      el.style.height = `${nextHeight}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    requestAnimationFrame(resize);
  }, [value, maxLines]);

  return ref;
}

export default function Chats() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUser = getStoredUser({});
  const myId = myUser._id || myUser.id;
  const baseRoute = myUser?.role === 'supplier' ? '/supplier' : '/store';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [bootError, setBootError] = useState('');

  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);
  const activeConvRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const textareaRef = useAutoResizeTextarea(text);
  const sendInFlightRef = useRef(false);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  useEffect(() => {
    if (!localStorage.getItem(WARN_KEY)) setShowWarning(true);
  }, []);

  const dismissWarning = () => {
    localStorage.setItem(WARN_KEY, '1');
    setShowWarning(false);
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chats`, { headers });
      const data = await res.json();
      if (res.ok) setConversations(data.conversations || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  const scrollToBottom = () =>
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

  const fetchMessages = useCallback(async (convId, silent = false) => {
    try {
      const res = await fetch(`${API}/chats/${convId}`, { headers });
      const data = await res.json();
      if (!res.ok) return;
      setMessages((prev) => {
        const merged = mergeChatMessages(data.messages, prev);
        if (messagesShallowEqual(prev, merged)) return prev;
        if (!silent) scrollToBottom();
        return merged;
      });
    } catch {
      /* ignore */
    }
  }, [token]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((convId) => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      if (activeConvRef.current?._id === convId) {
        fetchMessages(convId, true);
        fetchConversations();
      }
    }, POLL_MS);
  }, [fetchMessages, fetchConversations, stopPolling]);

  useEffect(() => {
    fetchConversations();
    return () => stopPolling();
  }, [fetchConversations, stopPolling]);

  const openConversation = useCallback((conv) => {
    setActiveConv(conv);
    setMessages([]);
    setReplyTo(null);
    setImagePreview(null);
    setImageFile(null);
    fetchMessages(conv._id);
    startPolling(conv._id);
  }, [fetchMessages, startPolling]);

  useEffect(() => {
    const ctx = localStorage.getItem('chatContext');
    if (!ctx) return;
    const parsed = JSON.parse(ctx);
    localStorage.removeItem('chatContext');

    (async () => {
      try {
        const res = await fetch(`${API}/chats`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            recipientId: parsed.recipientId || parsed.storeOwnerId,
            context: {
              itemId: parsed.productId || parsed.context?.itemId,
              itemType: parsed.itemType || parsed.context?.itemType || 'Product',
              itemName: parsed.productName || parsed.context?.itemName,
              itemImage: parsed.productImg || parsed.context?.itemImage,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) return;
        openConversation(data.conversation);
        fetchConversations();
        if (parsed.prefillText) {
          setTimeout(() => setText(parsed.prefillText), 400);
        } else if (parsed.productName) {
          setTimeout(() => setText(
            `مرحباً، أنا مهتم بـ: ${parsed.productName} — ${parsed.productPrice} ₪`,
          ), 400);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [openConversation, fetchConversations, token]);

  const handleImageSelect = async (file, inputEl) => {
    if (inputEl) inputEl.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('الصورة أكبر من 5MB');
    try {
      const url = await uploadImage(file);
      setImageFile(url);
      setImagePreview(url);
    } catch (err) {
      alert(err.message || 'فشل رفع الصورة');
    }
  };

  const sendMessage = async () => {
    if ((!text.trim() && !imageFile) || !activeConv || sending || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setSending(true);

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      clientKey: `c-${Date.now()}`,
      sender: { _id: myId },
      text: text.trim(),
      image: imageFile || null,
      replyTo: replyTo || null,
      createdAt: new Date(),
      read: false,
    };

    setMessages((prev) => [...prev, optimistic]);
    const sentText = text.trim();
    const sentImage = imageFile;
    const sentReply = replyTo;
    setText('');
    setImagePreview(null);
    setImageFile(null);
    setReplyTo(null);
    scrollToBottom();

    try {
      const res = await fetch(`${API}/chats/${activeConv._id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: sentText,
          image: sentImage,
          replyTo: sentReply ? {
            messageId: sentReply._id,
            text: sentReply.text,
            senderName: sentReply.sender?.name || 'مستخدم',
          } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessages((prev) => prev.map((m) =>
        m._id === optimistic._id
          ? { ...data.message, clientKey: optimistic.clientKey }
          : m,
      ));
      fetchConversations();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(sentText);
      setImageFile(sentImage);
      setImagePreview(sentImage);
      setReplyTo(sentReply);
      alert(`خطأ: ${err.message}`);
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
    }
  };

  const getOther = (conv) =>
    conv.participants?.find((p) => {
      const pid = p._id?.toString() || p?.toString();
      return pid !== myId?.toString();
    }) || conv.participants?.[0];

  const getInitial = (name) => name?.charAt(0) || '؟';

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const diff = Date.now() - d;
    if (diff < 86400000) return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'أمس';
    if (diff < 604800000) return d.toLocaleDateString('ar-EG', { weekday: 'short' });
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  };

  const formatListTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const diff = Date.now() - d;
    if (diff < 60000) return 'الآن';
    if (diff < 86400000) return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'أمس';
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  };

  const openItemInStore = (item) => {
    const path = getChatItemPath(item, { role: 'store', baseRoute });
    if (path) navigate(path);
    else alert('لا يمكن فتح هذا العنصر من لوحة المتجر');
  };

  const backToList = () => {
    stopPolling();
    setActiveConv(null);
    setMessages([]);
  };

  const referencedItems = activeConv ? getReferencedItems(activeConv) : [];
  const timeline = useMemo(
    () => buildChatTimeline(messages, referencedItems),
    [messages, referencedItems],
  );
  const showList = !activeConv;
  const showWindow = !!activeConv;

  if (loading) {
    return (
      <div className="chats-page" dir="rtl">
        <div className="messenger-container chat-skeleton">
          <div className="chats-sidebar">
            <div className="sidebar-header">
              <div className="chat-skeleton__line chat-skeleton__line--title" />
            </div>
            <div className="chats-list">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="chat-skeleton__item">
                  <div className="chat-skeleton__avatar" />
                  <div className="chat-skeleton__body">
                    <div className="chat-skeleton__line chat-skeleton__line--name" />
                    <div className="chat-skeleton__line chat-skeleton__line--msg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="chat-window chat-window--empty">
            <MessageCircle size={48} strokeWidth={1.5} className="chat-empty-icon" />
            <p>جاري تحميل المحادثات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chats-page" dir="rtl">
      {showWarning && (
        <div className="chat-expiry-toast">
          <div className="chat-expiry-toast__inner">
            <span className="chat-expiry-toast__icon">⏳</span>
            <div>
              <p className="chat-expiry-toast__title">تنبيه: الرسائل تُحذف تلقائياً</p>
              <p className="chat-expiry-toast__text">
                تُحذف الرسائل بعد <strong>4 أيام</strong> من إرسالها لتخفيف التخزين.
              </p>
            </div>
          </div>
          <button type="button" className="chat-expiry-toast__btn" onClick={dismissWarning}>
            فهمت ✓
          </button>
        </div>
      )}

      {bootError && <div className="chat-boot-error">{bootError}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden-input"
        onChange={(e) => handleImageSelect(e.target.files?.[0], e.target)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden-input"
        onChange={(e) => handleImageSelect(e.target.files?.[0], e.target)}
      />

      <div className="messenger-container">
        <div className={`chats-sidebar ${showWindow ? 'mobile-hidden' : ''}`}>
          <div className="sidebar-header">
            <h3><MessageCircle size={20} strokeWidth={2.2} /> الرسائل</h3>
            <span>{conversations.length} محادثة</span>
          </div>
          <div className="chats-list">
            {conversations.length === 0 ? (
              <div className="chats-empty-state">
                <MessageCircle size={40} strokeWidth={1.5} />
                <p>لا توجد محادثات بعد</p>
                <span>ستظهر محادثات الزبائن هنا</span>
              </div>
            ) : (
              conversations.map((conv) => {
                const other = getOther(conv);
                const unread = getUnreadCountForUser(conv.unreadCount, myId);
                const isActive = activeConv?._id === conv._id;

                return (
                  <div
                    key={conv._id}
                    className={`chat-item${isActive ? ' active' : ''}${unread > 0 ? ' has-unread' : ''}`}
                    onClick={() => openConversation(conv)}
                  >
                    <div className="chat-avatar">{getInitial(other?.name)}</div>
                    <div className="chat-info">
                      <h4>{other?.name || 'مستخدم'}</h4>
                      <ChatListPreview conv={conv} myId={myId} unread={unread} />
                    </div>
                    <div className="chat-meta">
                      <span className={`chat-time${unread > 0 ? ' chat-time--unread' : ''}`}>
                        {formatListTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                      </span>
                      {unread > 0 && (
                        <span className="chat-unread-badge" aria-label={`${unread} غير مقروء`}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {!activeConv ? (
          <div className={`chat-window chat-window--empty ${showList ? 'mobile-hidden' : ''}`}>
            <MessageCircle size={56} strokeWidth={1.2} className="chat-empty-icon" />
            <p className="chat-empty-title">اختر محادثة للبدء</p>
            <span className="chat-empty-sub">رسائل الزبائن تظهر هنا</span>
          </div>
        ) : (
          <div className={`chat-window ${showList ? 'mobile-hidden' : ''}`}>
            <button
              type="button"
              className="chat-back-fab"
              onClick={backToList}
              aria-label="رجوع للمحادثات"
            >
              <ChevronRight size={22} strokeWidth={2.2} />
            </button>

            <div className="chat-window-header">
              <div className="chat-window-header__user">
                <div className="chat-avatar">{getInitial(getOther(activeConv)?.name)}</div>
                <div>
                  <h4>{getOther(activeConv)?.name || 'مستخدم'}</h4>
                  <span className="chat-window-header__hint">⏳ الرسائل تُحذف بعد 4 أيام</span>
                </div>
              </div>
              <button
                type="button"
                className="chat-window-header__wa"
                onClick={() => {
                  const other = getOther(activeConv);
                  const phone = other?.phone || other?.whatsapp;
                  if (!phone) return alert('رقم الواتساب غير متاح');
                  window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
                }}
              >
                واتساب
              </button>
            </div>

            <div className="chat-messages">
              {timeline.length === 0 && (
                <div className="chat-messages-empty">
                  <span>👋</span>
                  <p>ابدأ المحادثة الآن</p>
                </div>
              )}

              {timeline.map((entry, i) => {
                if (entry.type === 'item') {
                  const item = entry.item;
                  return (
                    <SharedItemCard
                      key={`item:${item.itemType}:${item.itemId}:${item.addedAt || i}`}
                      item={item}
                      onClick={openItemInStore}
                    />
                  );
                }

                const msg = entry.msg;
                const isMine = isMessageSenderMine(msg.sender, myId);
                return (
                  <div
                    key={msg.clientKey || msg._id || i}
                    className={`msg msg--animate ${isMine ? 'sent' : 'received'}`}
                    onDoubleClick={() => setReplyTo(msg)}
                    title="انقر مرتين للرد"
                  >
                    {msg.replyTo?.text && (
                      <div className="msg-reply-quote">
                        <span className="msg-reply-name">{msg.replyTo.senderName}:</span>{' '}
                        {msg.replyTo.text}
                      </div>
                    )}
                    {msg.image && (
                      <button
                        type="button"
                        className="msg-image-btn"
                        onClick={() => setLightboxUrl(msg.image)}
                      >
                        <img src={msg.image} alt="" className="msg-image" />
                      </button>
                    )}
                    {msg.text && <p className="msg-text">{msg.text}</p>}
                    <span className="msg-meta">
                      {formatTime(msg.createdAt)}
                      {isMine && (
                        <span className={`read-status${msg.read ? ' is-read' : ''}`} aria-label={msg.read ? 'مقروء' : 'مُرسَل'}>
                          {msg.read ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}

              {sending && (
                <div className="typing-indicator" aria-label="جاري الإرسال">
                  <span /><span /><span />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {replyTo && (
              <div className="reply-preview-bar">
                <div>
                  <span className="reply-preview-bar__label">
                    رداً على: {replyTo.sender?.name || 'مستخدم'}
                  </span>
                  <p>{replyTo.image ? '📷 صورة' : replyTo.text}</p>
                </div>
                <button type="button" onClick={() => setReplyTo(null)} aria-label="إلغاء الرد">✕</button>
              </div>
            )}

            {imagePreview && (
              <div className="image-preview-bar">
                <img src={imagePreview} alt="" />
                <span>صورة مرفقة</span>
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageFile(null); }}
                  aria-label="إزالة الصورة"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="chat-composer">
              <div className="chat-composer__tools">
                <button
                  type="button"
                  className="chat-media-btn"
                  title="إرفاق صورة"
                  aria-label="إرفاق صورة"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={21} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="chat-media-btn"
                  title="التقاط صورة"
                  aria-label="التقاط صورة"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={21} strokeWidth={2} />
                </button>
              </div>
              <div className="chat-composer__input-wrap">
                <textarea
                  ref={textareaRef}
                  className="chat-composer__input"
                  placeholder="اكتب رسالة..."
                  value={text}
                  rows={1}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending}
                />
              </div>
              <button
                type="button"
                className="chat-composer__send"
                onClick={sendMessage}
                disabled={sending || (!text.trim() && !imageFile)}
                aria-label="إرسال"
              >
                <Send size={20} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div className="chat-lightbox" onClick={() => setLightboxUrl(null)} role="presentation">
          <button type="button" className="chat-lightbox__close" onClick={() => setLightboxUrl(null)} aria-label="إغلاق">
            <X size={24} />
          </button>
          <img src={lightboxUrl} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
