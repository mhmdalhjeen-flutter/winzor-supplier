import { useEffect, useState } from "react";

import { API_URL } from "../../lib/apiUrl";

const API = API_URL;

const EMPTY = { title: "", description: "", icon: "🎁", isActive: true };

export default function MemberPrizes() {
  const [prizes, setPrizes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const load = () => {
    setLoading(true);
    fetch(`${API}/stores/my/member-prizes`, { headers: headers() })
      .then((r) => r.json())
      .then((data) => setPrizes(data.prizes || []))
      .catch(() => setMsg("تعذّر التحميل"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/stores/my/member-prizes`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setForm(EMPTY);
      setMsg("تمت إضافة الجائزة");
      load();
    } catch (err) {
      setMsg(err.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-card" dir="rtl">
      <h1>🎁 جوائز الأعضاء</h1>
      <p className="muted">تظهر للزبائن الأعضاء فقط داخل صفحة المتجر</p>

      <form onSubmit={submit} style={{ marginTop: 20, display: "grid", gap: 12, maxWidth: 480 }}>
        <input className="form-input" placeholder="عنوان الجائزة" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="form-input" placeholder="الوصف" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="form-input" placeholder="أيقونة" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "..." : "إضافة جائزة"}</button>
      </form>

      {msg && <p style={{ marginTop: 12, color: "#6366f1", fontWeight: 700 }}>{msg}</p>}

      {!loading && (
        <ul style={{ marginTop: 24, listStyle: "none", padding: 0 }}>
          {prizes.map((p) => (
            <li key={p._id} style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{p.icon}</span> <strong>{p.title}</strong>
              <p className="muted">{p.description}</p>
            </li>
          ))}
          {prizes.length === 0 && <p className="muted">لا جوائz للأعضاء بعد</p>}
        </ul>
      )}
    </div>
  );
}
