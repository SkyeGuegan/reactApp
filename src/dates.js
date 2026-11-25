// Play dates shown on the site. Admins see the exact day; everyone else sees
// only the month, so the public page doesn't map out when the group meets.
// (This is display only: the API still returns exact timestamps to anyone who
// queries it directly.)
export function fmtPlayDate(iso, exact) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return exact
    ? d.toLocaleDateString([], { dateStyle: 'medium' })
    : d.toLocaleDateString([], { month: 'short', year: 'numeric' });
}
