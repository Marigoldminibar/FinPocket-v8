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

  const INCOME_KEY = 'fp_income_' + DEVICE_ID;
  const engine = window.Engine;
  if (!engine) {
    document.body.innerHTML = '<div style="padding:30px;font-family:Arial;color:#fff;background:#0b1220"><h2>FinPocket yüklenemedi</h2><p>engine.js bulunamadı veya JavaScript çalıştırılamadı.</p></div>';
    return;
  }

  let totalIncome = Number(localStorage.getItem(INCOME_KEY) || 0);
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
    backup: $('backupBtn'), qr: $('qrBtn'), restore: $('restoreBtn'), restoreFile: $('restoreFile'), reset: $('resetBtn'),
    home: $('homeBtn'), cards: $('cardsBtn'), money: $('moneyBtn'), settings: $('settingsBtn')
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
    localStorage.setItem(INCOME_KEY, String(totalIncome));
  }
  function isPlan(item) {
    return (item.type === 'credit' || item.installmentPlan) && Array.isArray(item.schedule);
  }
  function debtAmount(item) {
    if (isPlan(item)) return item.schedule.filter(x => !x.paid).reduce((s,x) => s + Number(x.amount || 0), 0);
    return Number(item.amount ?? item.debt ?? 0);
  }
  function monthPayment(item, year, month) {
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
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const totalDebt = debts.reduce((s,i) => s + debtAmount(i), 0);
    const monthly = debts.reduce((s,i) => s + monthPayment(i,y,m), 0);
    el.totalDebt.textContent = '₺ ' + money(totalDebt);
    el.totalIncome.textContent = '₺ ' + money(totalIncome);
    el.monthlyPayment.textContent = '₺ ' + money(monthly);
    el.remaining.textContent = '₺ ' + money(totalIncome - monthly);
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
    if (!name || !(amount > 0)) return alert('Ad ve tutar geçerli olmalı.');
    if (isPlan(item)) {
      const oldMonthly = Number(item.monthly || 0);
      const newMonthly = Number(el.editMonthly.value || oldMonthly);
      if (item.type === 'credit') engine.normalizeCredit(item); else engine.normalizeInstallment(item);
      item.schedule.forEach(s => { if (!s.paid) s.amount = newMonthly; });
      item.monthly = newMonthly;
      item.amount = item.schedule.reduce((s,x) => s + Number(x.amount||0), 0);
      if (item.type === 'credit') item.bank = name; else item.name = name;
      if (item.type === 'credit') engine.normalizeCredit(item); else engine.normalizeInstallment(item);
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
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        localStorage.setItem('fp_engine_' + DEVICE_ID, JSON.stringify(d.debts || []));
        totalIncome = Number(d.income || 0); saveIncome();
        location.reload();
      } catch (_) { alert('Yedek dosyası okunamadı.'); }
    };
    r.readAsText(file);
  }

  function resetDevice() {
    if (!confirm('BU TELEFON / BİLGİSAYARDAKİ tüm FinPocket verileri silinsin mi?')) return;
    ['fp_engine_'+DEVICE_ID, INCOME_KEY, 'fp_first_run_'+DEVICE_ID].forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  // Event delegation makes the interface work even if a button is re-rendered.
  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-action],.debtItem');
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
    if (id === 'closeSettingsBtn') return el.settingsModal.classList.add('hidden');
    if (id === 'moneyBtn') return openIncome();
    if (id === 'homeBtn') return window.scrollTo({top:0,behavior:'smooth'});
    if (id === 'cardsBtn') return document.querySelector('.list')?.scrollIntoView({behavior:'smooth'});
    if (id === 'backupBtn') return backup();
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
