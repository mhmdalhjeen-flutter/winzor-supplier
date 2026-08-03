import { Home, Box, ShoppingCart, Settings, Headset } from "lucide-react";

export default function Sidebar({ open }) {
  return (
    <div className={`sidebar ${open ? "active" : ""}`}>
      <div className="logo">B2B Market</div>

      <nav>
        <a><Home size={18}/> الرئيسية</a>
        <a><Box size={18}/> العناصر</a>
        <a><ShoppingCart size={18}/> العروض</a>
        <a><Settings size={18}/> الإعدادات</a>
        <a><Headset size={18}/> الدعم</a>
      </nav>
    </div>
  );
}