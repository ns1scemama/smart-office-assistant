// Urgency must be distinguishable without relying on color alone (SPEC.md
// quality requirement) — every badge carries a Hebrew label plus a color.

const LABELS = {
  High: 'דחוף',
  Medium: 'בינוני',
  Low: 'נמוך',
};

export default function UrgencyBadge({ urgency }) {
  const label = LABELS[urgency] || urgency;
  const cssClass = ['High', 'Medium', 'Low'].includes(urgency) ? urgency : 'Low';
  return (
    <span className={`badge ${cssClass}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
