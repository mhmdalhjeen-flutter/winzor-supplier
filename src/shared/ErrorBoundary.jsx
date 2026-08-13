import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 px-6 font-sans">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow">
            <h1 className="mb-2 text-lg font-black text-gray-900">حدث خطأ غير متوقع</h1>
            <p className="mb-4 text-sm text-gray-600">
              {this.props.fallbackMessage || 'تعذّر عرض الصفحة. جرّب إعادة المحاولة أو تحديث المتصفح.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-xl bg-[#1e3a8a] px-5 py-2.5 text-sm font-bold text-white"
              >
                إعادة المحاولة
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-800"
              >
                تحديث الصفحة
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(this.props.homePath || '/login')}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 underline"
              >
                {this.props.homeLabel || 'العودة لتسجيل الدخول'}
              </button>
            </div>
            <details className="mt-4 text-right text-xs text-gray-500">
              <summary className="cursor-pointer font-bold">تفاصيل الخطأ</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-left text-[11px] text-red-700">
                {error?.message || String(error)}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
