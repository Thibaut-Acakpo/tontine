// Aides responsive (sans dépendance) :
// 1) copie les en-têtes de colonnes dans data-label pour afficher les tableaux en cartes sur mobile (voir responsive.css) ;
// 2) garde l'onglet actif visible dans la barre d'onglets défilante.

function labelTables() {
  document.querySelectorAll('.shell table').forEach((table) => {
    const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr').forEach((tr) => {
      let col = 0;
      [...tr.children].forEach((td) => {
        if (td.tagName !== 'TD') return;
        const span = td.colSpan || 1;
        const label = span > 1 ? '' : (heads[col] || '');
        if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
        col += span;
      });
    });
  });
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; labelTables(); });
}

if (typeof document !== 'undefined') {
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.tabs button');
    if (btn) requestAnimationFrame(() => btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }));
  });
}
