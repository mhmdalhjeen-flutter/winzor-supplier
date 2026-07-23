import { useEffect, useState } from 'react';
import { FormNoticeToast } from './FormNotice';

export default function GlobalToastHost() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const onToast = (e) => {
      const { text, type = 'success', duration = 4500 } = e.detail || {};
      if (!text) return;
      setNotice({ text, type });
      window.clearTimeout(GlobalToastHost._timer);
      GlobalToastHost._timer = window.setTimeout(() => setNotice(null), duration);
    };

    window.addEventListener('app-toast', onToast);
    return () => window.removeEventListener('app-toast', onToast);
  }, []);

  return (
    <FormNoticeToast
      notice={notice}
      onClose={() => setNotice(null)}
    />
  );
}
