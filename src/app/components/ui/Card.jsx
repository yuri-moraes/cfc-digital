export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
    {children}
  </div>
);