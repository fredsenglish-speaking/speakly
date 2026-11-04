/** Questions that open on tap; plain <details>, so it works without JavaScript. */
export function FaqList({ items }: { items: [string, string][] }) {
  return (
    <div className="faq-list">
      {items.map(([q, a]) => (
        <details key={q} className="faq-item">
          <summary>
            <h3>{q}</h3>
            <span className="faq-sign" aria-hidden="true" />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
