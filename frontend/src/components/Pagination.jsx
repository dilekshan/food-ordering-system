export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} className={p === page ? "active" : ""} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
