export function StatusBanner({ items }) {
  return (
    <div className="status-banner">
      {items.map((item) => (
        <div key={item.label} className="status-banner__item">
          <span className="status-banner__label">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}
