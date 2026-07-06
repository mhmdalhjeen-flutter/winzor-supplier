import React from "react";
import { Loader2 } from "lucide-react";

/** علامة تحميل خفيفة — للتحميل الأول فقط (isLoading)، لا تظهر عند العودة من cache */
const LightLoadingHint = ({
  label = "جاري التحميل...",
  variant = "light",
  className = "",
}) => {
  const textClass = variant === "dark" ? "text-white/45" : "text-gray-400";
  const iconClass = variant === "dark" ? "text-white/35" : "text-primary/55";

  return (
    <div className={`flex items-center justify-center gap-2 py-10 ${className}`} aria-live="polite">
      <Loader2 size={16} className={`animate-spin shrink-0 ${iconClass}`} />
      <span className={`text-[11px] font-bold tracking-wide ${textClass}`}>{label}</span>
    </div>
  );
};

export default LightLoadingHint;
