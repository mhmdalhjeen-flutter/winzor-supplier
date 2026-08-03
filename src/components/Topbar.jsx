import { Menu, Bell } from "lucide-react";

export default function Topbar({ setOpen }) {
  return (
    <div className="topbar">
      <button className="menu-btn" onClick={() => setOpen(true)}>
        <Menu />
      </button>

      <input placeholder="ابحث عن عناصر أو عروض..." />

      <div className="actions">
        <Bell />
        <div className="avatar">T</div>
      </div>
    </div>
  );
}