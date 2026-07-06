/** رسالة خطأ تحت الحقل */
export default function FormFieldError({ message }) {
  if (!message) return null;
  return (
    <p className="form-field-error" role="alert">
      {message}
    </p>
  );
}
