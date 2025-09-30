export const Input = ({ type = 'text', placeholder, value, onChange, id }) => (
  <div>
    <label htmlFor={id} className="sr-only">{placeholder}</label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
    />
  </div>
);