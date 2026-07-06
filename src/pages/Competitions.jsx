import  { useState } from 'react';
import axios from '../services/api';
import '../styles/dashboard.css';

export default function Competitions() {
  const [formData, setFormData] = useState({
    name: '',
    minPoints: '',
    rank: 'فضي',
    details: '',
    prize: '',
    image: null
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await axios.post('/stores/my/competition-request', formData);
      setMessage("تم إرسال طلب المسابقة بنجاح! سيتم مراجعتها من قبل الإدارة.");
      setFormData({ name: '', minPoints: '', rank: 'فضي', details: '', prize: '', image: null });
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'تعذّر إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-competition-page">
      <h2 className="title">🏆 إضافة مسابقة للزبائن</h2>
      
      {message && <div className="alert-success">{message}</div>}

      <form className="standard-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>اسم المسابقة</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="أدخل اسم المسابقة" />
          </div>
          <div className="form-group">
            <label>الحد الأدنى للنقاط</label>
            <input type="number" name="minPoints" value={formData.minPoints} onChange={handleChange} required placeholder="مثال: 500" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>الرتبة المسموح بها</label>
            <select name="rank" value={formData.rank} onChange={handleChange}>
              <option value="فضي">فضي</option>
              <option value="ذهبي">ذهبي</option>
              <option value="بلاتيني">بلاتيني</option>
              <option value="ماسي">ماسي</option>
            </select>
          </div>
          <div className="form-group">
            <label>صورة المسابقة</label>
            <input type="file" onChange={handleImageChange} accept="image/*" />
          </div>
        </div>

        <div className="form-group">
          <label>الجائزة</label>
          <input type="text" name="prize" value={formData.prize} onChange={handleChange} required placeholder="ما هي الجائزة؟" />
        </div>

        <div className="form-group">
          <label>تفاصيل المسابقة</label>
          <textarea name="details" value={formData.details} onChange={handleChange} rows="4" placeholder="اشرح شروط وتفاصيل المسابقة..."></textarea>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'جاري الإرسال...' : 'إرسال طلب المسابقة'}
        </button>
      </form>
    </div>
  );
}
