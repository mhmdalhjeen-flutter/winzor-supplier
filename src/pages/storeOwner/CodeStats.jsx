import { useEffect, useState } from "react";

import { API_URL } from "../../lib/apiUrl";

const API = API_URL;

export default function CodeStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/stores/my/code-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message && !data.codePrefix) throw new Error(data.message);
        setStats(data);
      })
      .catch((err) => setError(err.message || "تعذّر التحميل"))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!stats) return null;

  const qrUrl = stats.qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(stats.qrPayload)}`
    : null;

  return (
    <div className="page-card" dir="rtl">
      <h1>🔑 بصمة المتجر والأكواد</h1>
      <p className="muted">جميع أكواد الكروt تبدأ ببصمتك الفريدة</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16, marginTop: 24 }}>
        <div className="stat-box"><span>البصمة</span><strong style={{ fontSize: 28 }}>{stats.codePrefix || "—"}</strong></div>
        <div className="stat-box"><span>أكواد صادرة</span><strong>{stats.codesIssued}</strong></div>
        <div className="stat-box"><span>أكواد مستخدمة</span><strong>{stats.codesUsed}</strong></div>
        <div className="stat-box"><span>إدخالات الزبائن</span><strong>{stats.codesEntered}</strong></div>
      </div>

      {qrUrl && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p className="muted">QR بصمة المتجر</p>
          <img src={qrUrl} alt="QR" style={{ borderRadius: 16, border: "4px solid #eee" }} />
          <p style={{ fontFamily: "monospace", marginTop: 12 }}>{stats.qrPayload}</p>
        </div>
      )}
    </div>
  );
}
