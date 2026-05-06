'use client'

export default function InlineSelect({ name, defaultValue, options, action, hiddenFields = {} }) {
  return (
    <form action={action}>
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="field" value={name} />
      <select
        name="value"
        defaultValue={defaultValue}
        onChange={e => e.target.form.requestSubmit()}
        style={{
          border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px',
          fontSize: 14, background: 'white', cursor: 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  )
}
