export default function Input({ label, type = 'text', value, onChange, placeholder, required = false }) {
  return (
    <div className='space-y-1.5 w-full'>
      <label className='block text-xs font-bold uppercase tracking-wider text-slate-400'>{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className='w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-inner'
      />
    </div>
  )
}
