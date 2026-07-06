import { Link } from 'react-router-dom';



function NotAuthorized() {

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const dashboardPath = user?.role === 'supplier' ? '/supplier' : '/store';



  return (

    <div style={{ padding: 40, textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>

      <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>

      <h1 style={{ marginBottom: 12 }}>403 — غير مصرح بالدخول</h1>

      <p style={{ color: '#64748b', lineHeight: 1.7 }}>

        هذه الصفحة غير متاحة حالياً على حسابك.

        <br />

        تم تعطيلها من إدارة المنصة.

      </p>

      <Link

        to={dashboardPath}

        style={{

          display: 'inline-block',

          marginTop: 24,

          padding: '10px 20px',

          background: '#2563eb',

          color: '#fff',

          borderRadius: 8,

          textDecoration: 'none',

          fontWeight: 700,

        }}

      >

        العودة للوحة التحكم

      </Link>

    </div>

  );

}



export default NotAuthorized;

