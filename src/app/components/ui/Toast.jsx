export const Toast = ({ message, type, show }) => {
  if (!show) return null;
  const baseStyle = "fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-xl transition-transform transform duration-300 z-50";
  const typeStyle = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`${baseStyle} ${typeStyle} ${show ? 'translate-x-0' : 'translate-x-full'}`}>
      {message}
    </div>
  );
};




