import  { useState } from 'react';
import '../styles/dashboard.css';

export default function Support() {
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 5000);
    setSubject("");
    setMsg("");
  };

  return (
    <div className="support-page">
      <h2 className="title">🎧 الدعم الفني والمساعدة</h2>
      
      <div className="support-container">
        <div className="support-info">
          <div className="support-card">
            <div className="icon">📞</div>
            <h4>اتصل بنا</h4>
            <p>966-5XXXXXXXX+</p>
          </div>
          <div className="support-card">
            <div className="icon">📧</div>
            <h4>البريد الإلكتروني</h4>
            <p>support@offers-tech.com</p>
          </div>
          <div className="support-card">
            <div className="icon">🕒</div>
            <h4>ساعات العمل</h4>
            <p>السبت - الخميس (8ص - 8م)</p>
          </div>
        </div>

        <form className="support-form" onSubmit={handleSubmit}>
          <h3>إرسال تذكرة دعم</h3>
          {sent && <div className="alert-success">تم إرسال رسالتك بنجاح! سيتواصل معك فريقنا قريباً.</div>}
          
          <div className="form-group">
            <label>موضوع الرسالة</label>
            <input 
              type="text" 
              required 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: استفسار عن الأكواد" 
            />
          </div>
          
          <div className="form-group">
            <label>تفاصيل المشكلة</label>
            <textarea 
              rows="5" 
              required
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="اكتب تفاصيل استفسارك هنا..."
            ></textarea>
          </div>
          
          <button type="submit" className="submit-support">إرسال الطلب</button>
        </form>
      </div>
    </div>
  );
}
