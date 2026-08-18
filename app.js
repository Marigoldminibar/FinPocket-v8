// FinPocket - Main Application (stable UI build)
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const deviceKey = 'fp_device_id';
  let DEVICE_ID = localStorage.getItem(deviceKey);
  if (!DEVICE_ID) {
    DEVICE_ID = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'device_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem(deviceKey, DEVICE_ID);
    }

  const engine = window.Engine;
  if (!engine) {
    document.body.innerHTML = '<div style="padding:30px;font-family:Arial;color:#fff;background:#0b1220"><h2>FinPocket yüklenemedi</h2><p>engine.js bulunamadı veya JavaScript çalıştırılamadı.</p></div>';
    return;
  }

  let totalIncome = Storage.loadIncome();
  let debts = engine.getAll();

  const el = {
    debtList: $('debtList'), totalDebt: $('totalDebt'), totalIncome: $('totalIncome'),
    monthlyPayment: $('monthlyPayment'), remaining: $('remaining'),
    modal: $('modal'), addDebtBtn: $('addDebtBtn'), saveDebtBtn: $('saveDebtBtn'), cancelBtn: $('cancelBtn'),
    name: $('nameInput'), category: $('categoryInput'), amount: $('amountInput'), date: $('dateInput'), monthlyRepeat: $('monthlyRepeatInput'),
    creditFields: $('creditFields'), installments: $('installmentInput'), monthly: $('monthlyInput'),
    otherWrap: $('otherPlanToggleWrap'), otherToggle: $('otherPlanToggle'),
    otherFields: $('otherPlanFields'), otherInstallments: $('otherInstallmentInput'), otherMonthly: $('otherMonthlyInput'),
    incomeCard: $('incomeCard'), incomeModal: $('incomeModal'), incomeInput: $('incomeInput'),
    saveIncome: $('saveIncomeBtn'), cancelIncome: $('cancelIncomeBtn'),
    detailModal: $('detailModal'), detailContent: $('detailContent'), closeDetail: $('closeDetailBtn'),
    editModal: $('editModal'), editName: $('editNameInput'), editAmount: $('editAmountInput'), editDate: $('editDateInput'), editMonthlyRepeat: $('editMonthlyRepeatInput'), editMonthly: $('editMonthlyInput'), editSave: $('saveEditBtn'), editCancel: $('cancelEditBtn'),
    settingsModal: $('settingsModal'), closeSettings: $('closeSettingsBtn'),
backup: $('backupBtn'), report: $('reportBtn'), qr: $('qrBtn'), restore: $('restoreBtn'), restoreFile: $('restoreFile'), reset: $('resetBtn'),    home: $('homeBtn'), cards: $('cardsBtn'), money: $('moneyBtn'), settings: $('settingsBtn')
  };

  function money(v) {
    return Number(v || 0).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  function dateTR(v) {
    if (!v) return '-';
    const p = String(v).split('-');
    return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : String(v);
  }
  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function saveIncome() {
  return Storage.saveIncome(totalIncome);
}
  function isPlan(item) {
    return (item.type === 'credit' || item.installmentPlan) && Array.isArray(item.schedule);
  }
function debtAmount(item) {
  if (isPlan(item)) {
    return item.schedule
      .filter(x => !x.paid)
      .reduce((s, x) => s + Number(x.amount || 0), 0);
  }

  if (item.type === 'creditcard') {
    return Number(item.remainingAmount ?? item.amount ?? item.debt ?? 0);
  }

  return Number(item.amount ?? item.debt ?? 0);
}  function monthPayment(item, year, month) {
    if (isPlan(item)) {
      return item.schedule.reduce((sum, s) => {
        if (s.paid || !s.date) return sum;
        const d = new Date(s.date + 'T12:00:00');
        return sum + (d.getFullYear() === year && d.getMonth() === month ? Number(s.amount || 0) : 0);
      }, 0);
    }
    if (item.paid) return 0;
    const raw = item.dueDate || item.date || item.day;
    if (!raw) return 0;
    const d = new Date(String(raw).includes('-') ? raw + 'T12:00:00' : raw);
    return (!Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month) ? debtAmount(item) : 0;
  }

  function renderSummary() {
    debts = engine.getAll();

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    let totalDebt = 0;
    let monthly = 0;
    let paidThisMonth = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    debts.forEach(item => {

        totalDebt += debtAmount(item);

        if (isPlan(item)) {

            item.schedule.forEach(s => {

                if (!s.date) return;

                const d = new Date(s.date + 'T12:00:00');

                if (
                    d.getFullYear() === y &&
                    d.getMonth() === m
                ) {

                    const amount = Number(s.amount || 0);

                    if (s.paid) {
                        paidThisMonth += amount;
                    } else {
                        monthly += amount;

                        if (d < new Date(y, m, now.getDate())) {
                            overdueCount++;
                        } else {
                            upcomingCount++;
                        }
                    }
                }
            });

        } else {

            if (item.paid) return;

            const raw =
                item.dueDate ||
                item.date ||
                item.day;

            if (!raw) return;

            const d = new Date(
                String(raw).includes('-')
                    ? raw + 'T12:00:00'
                    : raw
            );

            if (Number.isNaN(d.getTime())) return;

            if (
                d.getFullYear() === y &&
                d.getMonth() === m
            ) {

                const amount = debtAmount(item);

                monthly += amount;

                if (d < new Date(y, m, now.getDate())) {
                    overdueCount++;
                } else {
                    upcomingCount++;
                }
            }
        }
    });

    el.totalDebt.textContent =
        '₺ ' + money(totalDebt);

    el.totalIncome.textContent =
        '₺ ' + money(totalIncome);

    el.monthlyPayment.textContent =
        '₺ ' + money(monthly);

    el.remaining.textContent =
        '₺ ' + money(totalIncome - monthly);

    console.log('FinPocket Dashboard:', {
        totalDebt,
        monthly,
        paidThisMonth,
        overdueCount,
        upcomingCount
    });
}

  function typeLabel(item) {
    if (item.type === 'institution') return '🏢 Kurum';
    if (item.type === 'credit') return '🏦 Kredi';
    if (item.type === 'creditcard') return '💳 Kredi Kartı';
    return item.installmentPlan ? '📦 Diğer • Taksitli' : '📦 Diğer • Peşin';
  }

  function renderDebts() {
    debts = engine.getAll();
    el.debtList.innerHTML = '';
    if (!debts.length) {
      el.debtList.innerHTML = '<div class="empty">Henüz kayıt yok.<br><small>➕ Yeni Borç ile başlayabilirsin.</small></div>';
      return;
    }
    debts.forEach(item => {
      const title = item.bank || item.institution || item.name || 'Borç';
      const plan = isPlan(item);
      let detail = '';
      if (plan) detail = `Kalan Taksit: ${item.remainingInstallments}/${item.totalInstallments}<br>Sonraki Ödeme: ${dateTR(item.nextPayment)}`;
      else if (item.type === 'institution') detail = `Ödeme Tarihi: ${dateTR(item.date || item.day)}`;
      else if (item.type === 'creditcard') detail = `Son Ödeme: ${dateTR(item.dueDate)}${Number(item.paidAmount||0) > 0 ? `<br>Ödenen: ₺ ${money(item.paidAmount)}` : ''}`;
      else detail = `Ödeme Tarihi: ${dateTR(item.date)}`;
      const done = plan ? item.remainingInstallments === 0 : !!item.paid;
      const remaining = debtAmount(item);

      const card = document.createElement('div');
      card.className = 'debtItem';
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="debtInfo">
          <h4>${esc(title)}</h4>
          <p>${typeLabel(item)}</p>
          <p>${detail}</p>
          ${plan ? '<span class="clickHint">Detay için karta dokun</span>' : '<span class="clickHint">Detay / düzenleme için karta dokun</span>'}
        </div>
        <div class="cardRight">
          <div class="amount">₺ ${money(remaining)}</div>
          <div class="cardButtons">
            <button class="editBtn" data-action="edit">✏️</button>
            <button class="statusBtn ${done ? 'paid' : ''}" data-action="toggle">${done ? '✅ Ödendi' : '⏳ Bekliyor'}</button>
            <button class="iconBtn" data-action="delete">🗑️</button>
          </div>
        </div>`;
      el.debtList.appendChild(card);
    });
  }

  function refresh() {
    try { engine.migrate(); engine.save(); } catch (_) {}
    renderSummary();
    renderDebts();
  }

  function openIncome() {
    el.incomeInput.value = totalIncome || '';
    el.incomeModal.classList.remove('hidden');
    setTimeout(() => el.incomeInput.focus(), 50);
  }
  function closeIncome() { el.incomeModal.classList.add('hidden'); }

  function updateFields() {
    const isCredit = el.category.value === 'Kredi';
    const isOther = el.category.value === 'Diğer';
    el.creditFields.classList.toggle('hiddenFields', !isCredit);
    el.otherWrap.classList.toggle('hiddenFields', !isOther);
    el.otherFields.classList.toggle('hiddenFields', !(isOther && el.otherToggle.checked));
  }

  function openAddDebt() {
    el.modal.classList.remove('hidden');
    el.name.value = ''; el.amount.value = ''; el.date.value = '';
    el.installments.value = ''; el.monthly.value = '';
    el.otherInstallments.value = ''; el.otherMonthly.value = '';
    el.otherToggle.checked = false; el.monthlyRepeat.checked = false; el.category.value = 'Kurum';
    updateFields();
    setTimeout(() => el.name.focus(), 50);
  }
  function closeAddDebt() { el.modal.classList.add('hidden'); }

  function saveDebt() {
    const name = el.name.value.trim();
    const amount = Number(el.amount.value);
    const date = el.date.value;
    if (!name || amount <= 0 || !date) return alert('Ad, tutar ve tarih alanlarını doldur.');

    if (el.category.value === 'Kurum') {
      engine.createInstitution({institution:name, amount, date, monthlyRepeat:el.monthlyRepeat.checked});
    } else if (el.category.value === 'Kredi') {
      const total = Number(el.installments.value) || 1;
      const monthly = Number(el.monthly.value) || amount;
      engine.createCredit({bank:name, amount, monthly, installment:total, firstDate:date});
    } else if (el.category.value === 'Kredi Kartı') {
      engine.createCreditCard({bank:name, debt:amount, dueDate:date});
    } else if (el.otherToggle.checked) {
      const total = Number(el.otherInstallments.value) || 1;
      const monthly = Number(el.otherMonthly.value) || amount / total;
      engine.createInstallment({name, amount, totalInstallments:total, monthly, firstDate:date});
    } else {
      engine.add({type:'other', name, amount, date, paid:false});
    }
    closeAddDebt(); refresh();
  }

  function openDetail(id) {
    const item = engine.getAll().find(x => x.id === id);
    if (!item) return;
    if (isPlan(item)) {
      if (item.type === 'credit') engine.normalizeCredit(item); else engine.normalizeInstallment(item);
      const paidCount = item.schedule.filter(s => s.paid).length;
      const paidTotal = item.schedule.filter(s => s.paid).reduce((s,x) => s + Number(x.amount||0), 0);
      const remainingTotal = item.schedule.filter(s => !s.paid).reduce((s,x) => s + Number(x.amount||0), 0);
      el.detailContent.innerHTML = `
        <div class="detailHeader">
          <div><h2>${esc(item.bank || item.name || 'Borç')}</h2><p>₺ ${money(item.monthly)} / ay</p></div>
          <div class="detailStat">${item.remainingInstallments} / ${item.totalInstallments}<small>kalan</small></div>
        </div>
        <div class="detailSummary"><span>Ödenen: <b>₺ ${money(paidTotal)}</b></span><span>Kalan: <b>₺ ${money(remainingTotal)}</b></span></div>
        <button class="detailEditBtn" data-detail-edit="${item.id}">✏️ Borcu Düzenle</button>
        <div class="installmentList">
          ${item.schedule.map(s => `
            <div class="installment ${s.paid ? 'isPaid' : ''}">
              <div><b>${s.no}. Taksit</b><span>${dateTR(s.date)}</span></div>
              <strong>₺ ${money(s.amount)}</strong>
              <button data-installment="${s.no}">${s.paid ? '↩ Geri Al' : '⏳ Ödenecek'}</button>
            </div>`).join('')}
        </div>`;
      el.detailContent.querySelectorAll('[data-installment]').forEach(btn => {
        btn.addEventListener('click', () => {
          engine.toggleCreditInstallment(id, Number(btn.dataset.installment));
          openDetail(id); refresh();
        });
      });
      el.detailContent.querySelector('[data-detail-edit]')?.addEventListener('click', () => openEdit(id));
    } else {
      const original = Number(item.originalAmount ?? item.amount ?? item.debt ?? 0);
      const paid = Number(item.paidAmount || 0);
      const remaining = debtAmount(item);
      const payments = Array.isArray(item.payments) ? item.payments : [];
      el.detailContent.innerHTML = `
        <div class="detailHeader"><div><h2>${esc(item.bank || item.institution || item.name || 'Borç')}</h2><p>${typeLabel(item)}</p></div><div class="detailStat">₺ ${money(remaining)}<small>kalan</small></div></div>
        <button class="detailEditBtn" data-detail-edit="${item.id}">✏️ Borcu Düzenle</button>
        <div class="partialSummary">
          <div><span>Toplam Borç</span><b>₺ ${money(original)}</b></div>
          <div><span>Ödenen</span><b class="paidText">₺ ${money(paid)}</b></div>
          <div><span>Kalan</span><b class="remainingText">₺ ${money(remaining)}</b></div>
        </div>
        ${remaining > 0 ? `<div class="paymentBox"><input id="partialPaymentInput" type="number" min="0.01" step="0.01" placeholder="Ödeme tutarı"><button id="partialPaymentBtn">💳 Ödeme Kaydet</button></div>` : '<div class="fullyPaid">✅ Bu borç tamamen ödendi.</div>'}
        <div class="simpleDetail"><p><b>Ödeme tarihi:</b> ${dateTR(item.dueDate || item.date || item.day)}</p><p><b>Durum:</b> ${item.paid ? '✅ Ödendi' : '⏳ Bekliyor'}</p></div>
        ${payments.length ? `<div class="paymentHistory"><h3>Ödeme Geçmişi</h3>${payments.slice().reverse().map(p => `<div><span>${dateTR(p.date)}</span><b>₺ ${money(p.amount)}</b></div>`).join('')}</div>` : ''}`;
      el.detailContent.querySelector('[data-detail-edit]')?.addEventListener('click', () => openEdit(id));
      el.detailContent.querySelector('#partialPaymentBtn')?.addEventListener('click', () => {
        const value = Number(el.detailContent.querySelector('#partialPaymentInput').value);
        if (!(value > 0)) return alert('Geçerli bir ödeme tutarı gir.');
        engine.payPartial(id, value);
        openDetail(id); refresh();
      });
    }
    el.detailModal.classList.remove('hidden');
  }

  function openEdit(id) {
    const item = engine.getAll().find(x => x.id === id);
    if (!item) return;
    el.editModal.dataset.id = id;
    el.editName.value = item.bank || item.institution || item.name || '';
    el.editAmount.value = Number(item.originalAmount ?? item.amount ?? item.debt ?? 0);
    el.editDate.value = item.dueDate || item.date || item.day || item.startDate || '';
    el.editMonthlyRepeat.checked = !!item.monthlyRepeat;
    el.editMonthly.value = isPlan(item) ? Number(item.monthly || 0) : '';
    el.editMonthly.closest('.editMonthlyWrap').classList.toggle('hiddenFields', !isPlan(item));
    el.editModal.classList.remove('hidden');
    setTimeout(() => el.editName.focus(), 50);
  }

  function saveEdit() {
    const id = el.editModal.dataset.id;
    const item = engine.getAll().find(x => x.id === id);
    if (!item) return;
    const name = el.editName.value.trim();
    const amount = Number(el.editAmount.value);
    console.log('EDIT TARİHİ:', el.editDate.value);
    if (!name || !(amount > 0)) return alert('Ad ve tutar geçerli olmalı.');
if (isPlan(item)) {
  const oldMonthly = Number(item.monthly || 0);
  const newMonthly = Number(el.editMonthly.value || oldMonthly);

if (item.type === 'credit') {
  engine.normalizeCredit(item);

  const newDate = el.editDate.value;
  const current = item.schedule.find(s => !s.paid);

  if (newDate && current) {
    const currentIndex = item.schedule.indexOf(current);

    item.schedule.forEach((s, index) => {
      if (!s.paid) {
        const newPaymentDate = new Date(newDate + 'T12:00:00');
        newPaymentDate.setMonth(
          newPaymentDate.getMonth() + (index - currentIndex)
        );
        s.date = newPaymentDate.toISOString().slice(0, 10);
      }
    });

    item.nextPayment = newDate;
  }
} else {
  engine.normalizeInstallment(item);
}
  item.schedule.forEach(s => {
    if (!s.paid) s.amount = newMonthly;
  });

  item.monthly = newMonthly;      item.amount = item.schedule.reduce((s,x) => s + Number(x.amount||0), 0);
      if (item.type === 'credit') item.bank = name; else item.name = name;
      if (item.type !== 'credit') {
  engine.normalizeInstallment(item);
}
    } else {
      const paid = Math.min(Number(item.paidAmount || 0), amount);
      item.originalAmount = amount;
      item.paidAmount = paid;
      item.amount = Math.max(0, amount - paid);
      item.debt = item.amount;
      if (item.type === 'creditcard') item.bank = name; else if (item.type === 'institution') item.institution = name; else item.name = name;
      if (item.type === 'creditcard') item.dueDate = el.editDate.value; else { item.date = el.editDate.value; item.day = el.editDate.value; }
      if (item.type === 'institution') item.monthlyRepeat = !!el.editMonthlyRepeat.checked;
      item.paid = item.amount <= 0;
      item.status = item.paid ? 'paid' : 'waiting';
    }
    engine.save();
    el.editModal.classList.add('hidden');
    el.detailModal.classList.add('hidden');
    refresh();
  }

  function deleteDebt(id) {
    if (!confirm('Bu borç silinsin mi?')) return;
    engine.remove(id); refresh();
  }

  function backup() {
    const data = {
      debts: engine.getAll(),
      income: totalIncome,
      deviceId: DEVICE_ID,
      version: 'FinPocket-4-stable',
      created: new Date().toISOString()
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}));
    a.download = 'FinPocket.backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

function restore(file) {
  if (!confirm('Mevcut FinPocket verileriniz yedekten gelen verilerle değiştirilecek. Devam edilsin mi?')) {
    return;
  }

  const r = new FileReader();

  r.onload = () => {
    try {
      const d = JSON.parse(r.result);

      Storage.saveDebts(d.debts || []);

      totalIncome = Number(d.income || 0);
      saveIncome();

      if (d.settings) {
        Storage.saveSettings(d.settings);
      }

      alert('Yedek başarıyla geri yüklendi.');
      location.reload();

    } catch (_) {
      alert('Yedek dosyası okunamadı veya geçersiz.');
    }
  };

  r.readAsText(file);
}

  function resetDevice() {
    if (!confirm('BU TELEFON / BİLGİSAYARDAKİ tüm FinPocket verileri silinsin mi?')) return;
    Storage.reset();
    location.reload();
  }

  // Event delegation makes the interface work even if a button is re-rendered.
  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-action],.debtItem,#incomeCard');
    if (!t) return;
    const id = t.id;

    if (id === 'addDebtBtn') return openAddDebt();
    if (id === 'cancelBtn') return closeAddDebt();
    if (id === 'saveDebtBtn') return saveDebt();
    if (id === 'saveIncomeBtn') {
      const v = Number(el.incomeInput.value);
      if (v >= 0) { totalIncome=v; saveIncome(); closeIncome(); refresh(); }
      return;
    }
    if (id === 'cancelIncomeBtn') return closeIncome();
    if (id === 'settingsBtn') return el.settingsModal.classList.remove('hidden');
    if (id === 'notificationBtn') {
  return Notifications.requestPermission().then(result => {
    if (result === 'granted') {
      alert('🔔 Bildirimler açıldı.');
      Notifications.run();
    } else if (result === 'denied') {
      alert('Bildirim izni engellendi. Tarayıcı ayarlarından izin verebilirsiniz.');
    } else {
      alert('Bu cihaz bildirimleri desteklemiyor.');
    }
  });
}
    if (id === 'closeSettingsBtn') return el.settingsModal.classList.add('hidden');
    if (id === 'incomeCard') return openIncome();
    if (id === 'moneyBtn') return openIncome();
    if (id === 'homeBtn') return window.scrollTo({top:0,behavior:'smooth'});
    if (id === 'cardsBtn') return document.querySelector('.list')?.scrollIntoView({behavior:'smooth'});
    if (id === 'backupBtn') return backup();
    if (id === 'reportBtn') return generateExcelReport();
    if (id === 'restoreBtn') return el.restoreFile.click();
    if (id === 'resetBtn') return resetDevice();
    if (id === 'qrBtn') return window.location.href = './qr.html';
    if (id === 'closeDetailBtn') return el.detailModal.classList.add('hidden');
    if (id === 'saveEditBtn') return saveEdit();
    if (id === 'cancelEditBtn' || id === 'cancelEditBtn2') return el.editModal.classList.add('hidden');

    const card = t.closest('.debtItem');
    if (card) {
      const debtId = card.dataset.id;
      if (t.dataset.action === 'toggle') { engine.toggleCurrent(debtId); refresh(); return; }
      if (t.dataset.action === 'delete') { deleteDebt(debtId); return; }
      if (t.dataset.action === 'edit') { openEdit(debtId); return; }
      if (!t.closest('.cardButtons')) { openDetail(debtId); return; }
    }
  });

  // Non-button controls
  el.category.addEventListener('change', updateFields);
  el.otherToggle.addEventListener('change', updateFields);
  el.restoreFile.addEventListener('change', e => {
    if (e.target.files[0]) restore(e.target.files[0]);
    e.target.value = '';
  });

  updateFields();
  try { engine.processMonthlyPayments(); } catch (_) {}
  refresh();

  // New device: first screen is income, without carrying another device's data.
  const firstKey = 'fp_first_run_' + DEVICE_ID;
  if (!localStorage.getItem(firstKey)) {
    localStorage.setItem(firstKey, '1');
    setTimeout(openIncome, 250);
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
})();

function generateExcelReport() {
  if (typeof XLSX === 'undefined') {
    alert('Excel rapor sistemi yüklenemedi.');
    return;
  }

  const data = window.Engine.getAll();
  const income = Number(Storage.loadIncome() || 0);

  let paidInstallments = 0;
  let pendingInstallments = 0;
  let pendingDebts = 0;

  let totalDebt = 0;
  let totalPaid = 0;
  let monthlyPayment = 0;

  const debtRows = [];
  const paymentRows = [];
  const installmentRows = [];

  // =========================================================
  // VERİLERİ HAZIRLA
  // =========================================================

  data.forEach(item => {
    const name =
      item.institution ||
      item.bank ||
      item.name ||
      '-';

    const original = Number(
      item.originalAmount ??
      item.statementAmount ??
      item.amount ??
      item.debt ??
      0
    );

let remaining = Number(
  item.remainingAmount ??
  item.amount ??
  item.debt ??
  0
);

// Taksitli borçlarda kalan tutar,
// sadece ödenmemiş taksitlerin toplamıdır.
if (Array.isArray(item.schedule)) {
  remaining = item.schedule
    .filter(s => !s.paid)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
}

    const paid = Number(item.paidAmount || 0);

    totalDebt += remaining;
    totalPaid += paid;

    if (!item.paid && remaining > 0) {
      pendingDebts++;
    }

    // -------------------------
    // BORÇLAR
    // -------------------------

    debtRows.push({
      'Borç / Kurum': name,
      'Tür': item.type || '-',
      'İlk Tutar': original,
      'Ödenen': paid,
      'Kalan': remaining,
      'Son Ödeme':
        item.dueDate ||
        item.nextPayment ||
        item.date ||
        '-',
      'Durum': item.paid ? 'Ödendi' : 'Bekliyor'
    });

    // -------------------------
    // ÖDEMELER
    // -------------------------

    if (Array.isArray(item.payments)) {
      item.payments.forEach(payment => {
        paymentRows.push({
          'Borç / Kurum': name,
          'Tarih': payment.date || '-',
          'Ödeme Tutarı': Number(payment.amount || 0)
        });
      });
    }

    // -------------------------
    // TAKSİTLER
    // -------------------------

    if (Array.isArray(item.schedule)) {
      item.schedule.forEach(schedule => {
        if (schedule.paid) {
          paidInstallments++;
        } else {
          pendingInstallments++;
        }

        const amount = Number(schedule.amount || 0);

if (!schedule.paid) {
  const scheduleDate = new Date(schedule.date + 'T12:00:00');

  if (
    scheduleDate.getFullYear() === new Date().getFullYear() &&
    scheduleDate.getMonth() === new Date().getMonth()
  ) {
    monthlyPayment += amount;
  }
}

        installmentRows.push({
          'Borç / Kurum': name,
          'Taksit No': schedule.no,
          'Tarih': schedule.date || '-',
          'Tutar': amount,
          'Durum': schedule.paid
            ? 'Ödendi'
            : 'Bekliyor'
        });
      });
    }

    // -------------------------
    // AYLIK TEKRAR
    // -------------------------

if (
  item.type === 'creditcard' &&
  !item.paid
) {
  const dueDate = item.dueDate
    ? new Date(item.dueDate + 'T12:00:00')
    : null;

  const now = new Date();

  if (
    dueDate &&
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth()
  ) {
    monthlyPayment += remaining;
  }
}

    // -------------------------
    // KREDİ KARTI
    // -------------------------

    if (
      item.type === 'creditcard' &&
      !item.paid
    ) {
      monthlyPayment += remaining;
    }
  });

  const remainingIncome =
    income - monthlyPayment;

  // =========================================================
  // ÖZET VERİSİ
  // =========================================================

  const summaryRows = [
    ['FinPocket Finans Raporu', ''],
    ['Rapor Tarihi', new Date().toLocaleString('tr-TR')],
    ['', ''],

    ['GENEL ÖZET', ''],
    ['Aylık Gelir', income],
    ['Toplam Kalan Borç', totalDebt],
    ['Toplam Ödenen', totalPaid],
    ['Bu Ay Ödenecek', monthlyPayment],
    ['Ödeme Sonrası Kalan', remainingIncome],

    ['', ''],

    ['RAPOR İÇERİĞİ', ''],
    ['Toplam Borç Kaydı', `${debtRows.length} adet`],
    ['Gerçekleşen Ödemeler', `${paymentRows.length} adet`],
    ['Toplam Taksit', `${installmentRows.length} adet`],
    ['Bekleyen Borç', `${pendingDebts} adet`],
    ['Ödenen Taksit', `${paidInstallments} adet`],
    ['Bekleyen Taksit', `${pendingInstallments} adet`]
  ];

  // =========================================================
  // EXCEL DOSYASINI OLUŞTUR
  // =========================================================

  const wb = XLSX.utils.book_new();

  const wsSummary =
    XLSX.utils.aoa_to_sheet(summaryRows);

  const wsDebts =
    XLSX.utils.json_to_sheet(debtRows);

  const wsPayments =
    XLSX.utils.json_to_sheet(paymentRows);

  const wsInstallments =
    XLSX.utils.json_to_sheet(installmentRows);

  XLSX.utils.book_append_sheet(
    wb,
    wsSummary,
    'Özet'
  );

  XLSX.utils.book_append_sheet(
    wb,
    wsDebts,
    'Borçlar'
  );

  XLSX.utils.book_append_sheet(
    wb,
    wsPayments,
    'Ödemeler'
  );

  XLSX.utils.book_append_sheet(
    wb,
    wsInstallments,
    'Taksitler'
  );

  // =========================================================
  // PROFESYONEL STİLLER
  // =========================================================

  const border = {
    top: {
      style: 'thin',
      color: { rgb: 'D9E1F2' }
    },
    bottom: {
      style: 'thin',
      color: { rgb: 'D9E1F2' }
    },
    left: {
      style: 'thin',
      color: { rgb: 'D9E1F2' }
    },
    right: {
      style: 'thin',
      color: { rgb: 'D9E1F2' }
    }
  };

  const titleStyle = {
    font: {
      name: 'Calibri',
      sz: 18,
      bold: true,
      color: { rgb: 'FFFFFF' }
    },
    fill: {
      fgColor: { rgb: '17365D' }
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center'
    },
    border
  };

  const sectionStyle = {
    font: {
      name: 'Calibri',
      sz: 12,
      bold: true,
      color: { rgb: 'FFFFFF' }
    },
    fill: {
      fgColor: { rgb: '4472C4' }
    },
    alignment: {
      horizontal: 'left',
      vertical: 'center'
    },
    border
  };

  const labelStyle = {
    font: {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: '1F1F1F' }
    },
    fill: {
      fgColor: { rgb: 'EAF2F8' }
    },
    alignment: {
      vertical: 'center'
    },
    border
  };

  const valueStyle = {
    font: {
      name: 'Calibri',
      sz: 11,
      color: { rgb: '1F1F1F' }
    },
    alignment: {
      horizontal: 'right',
      vertical: 'center'
    },
    border
  };

  const headerStyle = {
    font: {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: 'FFFFFF' }
    },
    fill: {
      fgColor: { rgb: '17365D' }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true
    },
    border
  };

  const normalStyle = {
    font: {
      name: 'Calibri',
      sz: 10
    },
    alignment: {
      vertical: 'center'
    },
    border
  };

  const statusPaidStyle = {
    font: {
      name: 'Calibri',
      sz: 10,
      bold: true,
      color: { rgb: '006100' }
    },
    fill: {
      fgColor: { rgb: 'C6EFCE' }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    border
  };

  const statusPendingStyle = {
    font: {
      name: 'Calibri',
      sz: 10,
      bold: true,
      color: { rgb: '9C0006' }
    },
    fill: {
      fgColor: { rgb: 'FFC7CE' }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    border
  };

  const moneyFormat =
    '#,##0.00 [$₺-tr-TR]';

  // =========================================================
  // ÖZET SAYFASI
  // =========================================================

  wsSummary['!merges'] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 1 }
    },
    {
      s: { r: 3, c: 0 },
      e: { r: 3, c: 1 }
    },
    {
      s: { r: 10, c: 0 },
      e: { r: 10, c: 1 }
    }
  ];

  wsSummary['A1'].s = titleStyle;
  wsSummary['A4'].s = sectionStyle;
  wsSummary['A11'].s = sectionStyle;

  // Rapor tarihi
  if (wsSummary['B2']) {
    wsSummary['B2'].s = {
      font: {
        name: 'Calibri',
        sz: 10,
        italic: true,
        color: { rgb: '666666' }
      },
      alignment: {
        horizontal: 'right',
        vertical: 'center'
      }
    };
  }

  // Özet satırları
  for (let r = 4; r <= 8; r++) {
    if (wsSummary[`A${r + 1}`]) {
      wsSummary[`A${r + 1}`].s = labelStyle;
    }

    if (wsSummary[`B${r + 1}`]) {
      wsSummary[`B${r + 1}`].s = valueStyle;
      wsSummary[`B${r + 1}`].z = moneyFormat;
    }
  }

  // Rapor içeriği
  for (let r = 11; r <= 16; r++) {
    if (wsSummary[`A${r + 1}`]) {
      wsSummary[`A${r + 1}`].s = labelStyle;
    }

    if (wsSummary[`B${r + 1}`]) {
      wsSummary[`B${r + 1}`].s = {
        ...valueStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        }
      };
    }
  }

  // Ödeme sonrası kalan
  if (wsSummary['B9']) {
    wsSummary['B9'].s = {
      ...valueStyle,
      font: {
        name: 'Calibri',
        sz: 11,
        bold: true,
        color: remainingIncome >= 0
          ? { rgb: '006100' }
          : { rgb: '9C0006' }
      },
      fill: {
        fgColor: remainingIncome >= 0
          ? { rgb: 'C6EFCE' }
          : { rgb: 'FFC7CE' }
      }
    };

    wsSummary['B9'].z = moneyFormat;
  }

  // Genel özet para formatları
  ['B5', 'B6', 'B7', 'B8', 'B9'].forEach(ref => {
    if (wsSummary[ref]) {
      wsSummary[ref].z = moneyFormat;
    }
  });

  // Özet satır yükseklikleri
  wsSummary['!rows'] = [];
  wsSummary['!rows'][0] = { hpt: 30 };
  wsSummary['!rows'][1] = { hpt: 20 };
  wsSummary['!rows'][3] = { hpt: 23 };
  wsSummary['!rows'][10] = { hpt: 23 };

  // =========================================================
  // TABLO SAYFALARINI STİLLE
  // =========================================================

  function styleTableSheet(ws, moneyColumns = []) {
    const range =
      XLSX.utils.decode_range(
        ws['!ref'] || 'A1'
      );

    // Başlık
    for (
      let c = range.s.c;
      c <= range.e.c;
      c++
    ) {
      const cell =
        ws[
          XLSX.utils.encode_cell({
            r: 0,
            c
          })
        ];

      if (cell) {
        cell.s = headerStyle;
      }
    }

    // Veri satırları
    for (
      let r = 1;
      r <= range.e.r;
      r++
    ) {
      for (
        let c = range.s.c;
        c <= range.e.c;
        c++
      ) {
        const cell =
          ws[
            XLSX.utils.encode_cell({
              r,
              c
            })
          ];

        if (cell) {
          cell.s = normalStyle;
        }
      }
    }

    // Para sütunları
    moneyColumns.forEach(column => {
      for (
        let r = 1;
        r <= range.e.r;
        r++
      ) {
        const cell =
          ws[
            XLSX.utils.encode_cell({
              r,
              c: column
            })
          ];

        if (cell && typeof cell.v === 'number') {
          cell.z = moneyFormat;
          cell.s = {
            ...normalStyle,
            alignment: {
              horizontal: 'right',
              vertical: 'center'
            }
          };
        }
      }
    });

    // Durum sütunu
    for (
      let r = 1;
      r <= range.e.r;
      r++
    ) {
      const statusCell =
        ws[
          XLSX.utils.encode_cell({
            r,
            c: range.e.c
          })
        ];

      if (statusCell) {
        if (statusCell.v === 'Ödendi') {
          statusCell.s = statusPaidStyle;
        } else if (statusCell.v === 'Bekliyor') {
          statusCell.s = statusPendingStyle;
        }
      }
    }

    // Filtre
    if (ws['!ref']) {
      ws['!autofilter'] = {
        ref: ws['!ref']
      };
    }

    // Sabit başlık
    ws['!freeze'] = {
      xSplit: 0,
      ySplit: 1
    };

    // Başlık yüksekliği
    ws['!rows'] = [];
    ws['!rows'][0] = {
      hpt: 25
    };
  }

  styleTableSheet(
    wsDebts,
    [2, 3, 4]
  );

  styleTableSheet(
    wsPayments,
    [2]
  );

  styleTableSheet(
    wsInstallments,
    [3]
  );

  // =========================================================
  // SÜTUN GENİŞLİKLERİ
  // =========================================================

  wsSummary['!cols'] = [
    { wch: 28 },
    { wch: 22 }
  ];

  wsDebts['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 15 }
  ];

  wsPayments['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 20 }
  ];

  wsInstallments['!cols'] = [
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 15 }
  ];

  // =========================================================
  // TARİH SÜTUNLARI
  // =========================================================

  function formatDateColumn(ws, column) {
    const range =
      XLSX.utils.decode_range(
        ws['!ref'] || 'A1'
      );

    for (
      let r = 1;
      r <= range.e.r;
      r++
    ) {
      const cell =
        ws[
          XLSX.utils.encode_cell({
            r,
            c: column
          })
        ];

      if (
        cell &&
        typeof cell.v === 'string' &&
        cell.v !== '-'
      ) {
        cell.s = {
          ...normalStyle,
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          }
        };
      }
    }
  }

  formatDateColumn(wsDebts, 5);
  formatDateColumn(wsPayments, 1);
  formatDateColumn(wsInstallments, 2);

  // =========================================================
  // ÖZET SABİT BAŞLIK
  // =========================================================

  wsSummary['!freeze'] = {
    xSplit: 0,
    ySplit: 4
  };

  // =========================================================
  // SAYFA TAB RENGİ
  // =========================================================

  if (!wb.Workbook) {
    wb.Workbook = {};
  }

  if (!wb.Workbook.Sheets) {
    wb.Workbook.Sheets = [];
  }

  wb.Workbook.Sheets[0] = {
    name: 'Özet',
    Hidden: 0,
    TabColor: {
      rgb: '17365D'
    }
  };

  wb.Workbook.Sheets[1] = {
    name: 'Borçlar',
    Hidden: 0,
    TabColor: {
      rgb: '4472C4'
    }
  };

  wb.Workbook.Sheets[2] = {
    name: 'Ödemeler',
    Hidden: 0,
    TabColor: {
      rgb: '70AD47'
    }
  };

  wb.Workbook.Sheets[3] = {
    name: 'Taksitler',
    Hidden: 0,
    TabColor: {
      rgb: 'ED7D31'
    }
  };

  // =========================================================
  // DOSYA ADI
  // =========================================================

  const today =
    new Date().toISOString().slice(0, 10);

  XLSX.writeFile(
    wb,
    `FinPocket_Profesyonel_Rapor_${today}.xlsx`
  );
}