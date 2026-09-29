import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api, money, fdate, fdatetime } from '../api.js';

export async function exportTontinePDF(tontine, tontineId) {
  try {
    // Récupérer les données complètes
    const [tontineData, rounds, contributions, transactions] = await Promise.all([
      api(`/tontines/${tontineId}`).then((r) => r.data),
      api(`/tontines/${tontineId}/rounds`).then((r) => r.data),
      api(`/contributions?tontineId=${tontineId}&limit=500`).then((r) => r.data).catch(() => []),
      api(`/transactions?tontineId=${tontineId}&limit=500`).then((r) => r.data).catch(() => []),
    ]);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // En-tête
    doc.setFontSize(22);
    doc.setTextColor(242, 182, 50);
    doc.text('Tontine', 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Relevé généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 15, 20, { align: 'right' });

    // Titre
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text(tontineData.name, 15, 35);

    // Infos générales
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    let y = 45;
    doc.text(`Statut : ${tontineData.status}`, 15, y);
    doc.text(`Cotisation : ${money(tontineData.contributionAmount, tontineData.currency)}`, 90, y);
    doc.text(`Fréquence : ${tontineData.frequency}`, 150, y);
    y += 6;
    doc.text(`Membres : ${tontineData.memberCount}`, 15, y);
    doc.text(`Tours : ${tontineData.roundsDone}/${tontineData.roundsTotal}`, 90, y);
    doc.text(`Début : ${fdate(tontineData.startDate)}`, 150, y);
    y += 10;

    // Section Tours
    doc.setFontSize(13);
    doc.setTextColor(242, 182, 50);
    doc.text('Tours', 15, y);
    y += 4;

    // ✅ CORRECTION : utiliser autoTable(doc, {...}) au lieu de doc.autoTable({...})
    autoTable(doc, {
      startY: y,
      head: [['#', 'Bénéficiaire', 'Échéance', 'Payé/Total', 'Collecté', 'Statut']],
      body: rounds.map((r) => [
        r.roundNumber,
        r.beneficiaryName || '—',
        fdate(r.dueDate),
        `${r.contributionsPaid}/${r.contributionsTotal}`,
        money(r.collected, tontineData.currency),
        r.status,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [242, 182, 50], textColor: [42, 28, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });

    // Récupérer la position finale du tableau
    y = doc.lastAutoTable.finalY + 10;

    // Section Transactions
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setTextColor(242, 182, 50);
    doc.text('Historique des transactions', 15, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Date', 'Type', 'Membre', 'Montant', 'Statut']],
      body: transactions.slice(0, 100).map((x) => [
        x.txnNumber,
        fdatetime(x.createdAt),
        x.type,
        x.memberName || '—',
        money(x.amount, x.currency),
        x.status,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [242, 182, 50], textColor: [42, 28, 0], fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    // Pied de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i}/${pageCount} — Tontine © ${new Date().getFullYear()}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    // Télécharger
    doc.save(`tontine-${tontineData.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
  } catch (e) {
    console.error('PDF error:', e);
    alert('Erreur lors de la génération du PDF : ' + e.message);
  }
}