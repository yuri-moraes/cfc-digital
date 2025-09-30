export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button' }) => {
  const baseStyles = "w-full text-center font-semibold py-3 px-4 rounded-lg transition-transform transform active:scale-[0.98] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };
  return (
    <button type={type} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};