export const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }, minLen = 6) => {
  if (!currentPassword) return 'أدخل كلمة المرور الحالية';
  if (!newPassword) return 'أدخل كلمة المرور الجديدة';
  if (newPassword.length < minLen) return `كلمة المرور يجب أن تكون ${minLen} أحرف على الأقل`;
  if (newPassword !== confirmPassword) return 'كلمة المرور غير متطابقة';
  if (currentPassword === newPassword) return 'كلمة المرور الجديدة يجب أن تختلف عن الحالية';
  return null;
};

export const validatePasswordReset = ({ newPassword, confirmPassword, code }, minLen = 6) => {
  if (!code?.trim()) return 'أدخل رمز التحقق';
  if (!newPassword) return 'أدخل كلمة المرور الجديدة';
  if (newPassword.length < minLen) return `كلمة المرور يجب أن تكون ${minLen} أحرف على الأقل`;
  if (newPassword !== confirmPassword) return 'كلمة المرور غير متطابقة';
  return null;
};
