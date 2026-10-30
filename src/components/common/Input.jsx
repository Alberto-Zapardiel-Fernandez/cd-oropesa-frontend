export default function Input({ label, name, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div className='space-y-1.5'>
      {label && <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>{label}</label>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition'
      />
    </div>
  )
}
