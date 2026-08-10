// FinPocket - Finance Engine
(function () {
  const DEVICE_ID_KEY = 'fp_device_id';
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'device_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }
  const DEVICE_ID = getDeviceId();
  const KEY = 'fp_engine_' + DEVICE_ID;
  const LEGACY_KEY = 'fp_engine';

  function uid() {
    return (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'fp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }

  function isoDate(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return x.toISOString().slice(0, 10);
  }

  function addMonths(date, months) {
    const d = new Date(date + 'T12:00:00');
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return isoDate(d);
  }

  class DebtEngine {
    constructor() {
      this.migrateLegacyStorage();
      this.items = this.read();
      this.migrate();
      this.save();
    }

    migrateLegacyStorage() {
      try {
        if (!localStorage.getItem(KEY) && localStorage.getItem(LEGACY_KEY)) {
          localStorage.setItem(KEY, localStorage.getItem(LEGACY_KEY));
        }
      } catch {}
    }

    read() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; }
      catch { return []; }
    }

    save() { localStorage.setItem(KEY, JSON.stringify(this.items)); }

    add(data) {
      const item = {
        id: uid(), createdAt: new Date().toISOString(), paid: false, status: 'waiting', ...data
      };
      if (!item.installmentPlan && item.type !== 'credit') {
        const base = Number(item.originalAmount ?? item.amount ?? item.debt ?? 0);
        item.originalAmount = base;
        item.paidAmount = Number(item.paidAmount || 0);
        item.payments = Array.isArray(item.payments) ? item.payments : [];
        item.amount = Math.max(0, base - item.paidAmount);
        if ('debt' in item) item.debt = item.amount;
      }
      this.items.push(item); this.save(); return item;
    }

    update(id, values) {
      const item = this.items.find(x => x.id === id);
      if (!item) return null;
      Object.assign(item, values); this.save(); return item;
    }

    remove(id) { this.items = this.items.filter(x => x.id !== id); this.save(); }
    getAll() { return this.items; }

  createInstitution({ institution, amount, date, monthlyRepeat }) {
    return this.add({ type:"institution", institution, amount:Number(amount), date, day:date, repeat:"monthly", monthlyRepeat:!!monthlyRepeat, paid:false });
  }
    createCredit({ bank, amount, monthly, installment, firstDate }) {
      const total = Math.max(1, Number(installment) || 1);
      const monthlyAmount = Math.max(0, Number(monthly) || Number(amount) || 0);
      const start = firstDate || isoDate(new Date());
      const schedule = Array.from({length: total}, (_, i) => ({
        no: i + 1, date: addMonths(start, i), amount: monthlyAmount, paid: false
      }));
      return this.add({
        type:'credit', bank, amount:Number(amount) || monthlyAmount * total,
        monthly:monthlyAmount, installment:total, totalInstallments:total,
        remaining:total, remainingInstallments:total, startDate:start,
        nextPayment:schedule[0]?.date || start, schedule, paid:false
      });
    }

    createInstallment({ name, amount, totalInstallments, monthly, firstDate }) {
      const total = Math.max(1, Number(totalInstallments) || 1);
      const totalAmount = Math.max(0, Number(amount) || 0);
      const monthlyAmount = Math.max(0, Number(monthly) || (totalAmount / total));
      const start = firstDate || isoDate(new Date());
      const schedule = Array.from({length: total}, (_, i) => ({ no:i+1, date:addMonths(start,i), amount:monthlyAmount, paid:false }));
      return this.add({ type:'other', name, amount:totalAmount, installmentPlan:true, monthly:monthlyAmount, totalInstallments:total, remainingInstallments:total, startDate:start, nextPayment:schedule[0]?.date||start, schedule, paid:false });
    }

    createCreditCard({ bank, debt, dueDate }) {
      return this.add({ type:'creditcard', bank, debt:Number(debt), amount:Number(debt), dueDate, paid:false });
    }

    normalizeCredit(item) {
      if (item.type !== 'credit') return;
      const total = Number(item.totalInstallments || item.installment || 1);
      const monthly = Number(item.monthly || item.installmentAmount || item.amount || 0);
      const start = item.startDate || item.nextPayment || item.date || isoDate(new Date());
      if (!Array.isArray(item.schedule) || item.schedule.length !== total) {
        item.schedule = Array.from({length: total}, (_, i) => ({ no:i+1, date:addMonths(start, i), amount:monthly, paid:false }));
        // Keep legacy paid state on first installment if it existed.
        if (item.paid === true && item.schedule[0]) item.schedule[0].paid = true;
      }
      item.totalInstallments = total;
      item.installment = total;
      item.monthly = monthly;
      item.schedule.forEach((s, i) => { s.no=i+1; s.amount=Number(s.amount ?? monthly); s.date=s.date || addMonths(start, i); s.paid=!!s.paid; });
      const first = item.schedule.find(s => !s.paid);
      item.remainingInstallments = item.schedule.filter(s => !s.paid).length;
      item.remaining = item.remainingInstallments;
      item.nextPayment = first ? first.date : null;
      item.paid = item.remainingInstallments === 0;
    }

    normalizeInstallment(item) {
      if (!item.installmentPlan || !Array.isArray(item.schedule)) return;
      item.totalInstallments=Number(item.totalInstallments||item.installment||item.schedule.length||1);
      item.monthly=Number(item.monthly||0);
      item.schedule.forEach((s,i)=>{s.no=i+1;s.amount=Number(s.amount||item.monthly||0);s.date=s.date||addMonths(item.startDate||new Date(),i);s.paid=!!s.paid;});
      const first=item.schedule.find(s=>!s.paid);
      item.remainingInstallments=item.schedule.filter(s=>!s.paid).length; item.remaining=item.remainingInstallments; item.nextPayment=first?first.date:null; item.paid=item.remainingInstallments===0;
    }

    migrate() {
      this.items.forEach(item => {
        if (item.type === 'credit') this.normalizeCredit(item);
        if (item.installmentPlan) this.normalizeInstallment(item);
        if (!item.installmentPlan && item.type !== 'credit') {
          const legacyRemaining = Number(item.amount ?? item.debt ?? 0);
          if (item.originalAmount == null) item.originalAmount = legacyRemaining;
          item.paidAmount = Number(item.paidAmount || 0);
          item.payments = Array.isArray(item.payments) ? item.payments : [];
          item.amount = Math.max(0, Number(item.originalAmount) - item.paidAmount);
          if ('debt' in item) item.debt = item.amount;
          item.paid = item.amount <= 0;
          item.status = item.paid ? 'paid' : 'waiting';
        }
        if (item.type === 'institution') { item.date = item.date || item.day || ''; item.day = item.date; }
      });
    }

    toggleCreditInstallment(id, installmentNo) {
      const item = this.items.find(x => x.id === id);
      if (!item || (item.type !== 'credit' && !item.installmentPlan)) return;
      if(item.type==='credit') this.normalizeCredit(item); else this.normalizeInstallment(item);
      const s = item.schedule.find(x => x.no === installmentNo);
      if (!s) return;
      s.paid = !s.paid;
      if(item.type==='credit') this.normalizeCredit(item); else this.normalizeInstallment(item);
      this.save();
    }

payPartial(id, amount) {
  const item = this.items.find(x => x.id === id);
  if (!item || item.installmentPlan || item.type === 'credit') return false;

  const value = Number(amount);
  if (!(value > 0)) return false;

  const remaining = Number(
    item.amount ?? item.debt ?? item.originalAmount ?? 0
  );

  const paid = Math.min(value, remaining);

  item.paidAmount = Number(item.paidAmount || 0) + paid;
  item.payments = Array.isArray(item.payments) ? item.payments : [];
  item.payments.push({
    amount: paid,
    date: isoDate(new Date())
  });

  item.amount = Math.max(0, remaining - paid);

  if ('debt' in item) {
    item.debt = item.amount;
  }

  item.paid = item.amount <= 0;
  item.status = item.paid ? 'paid' : 'waiting';

  if (item.paid) {
    if (item.type === 'institution' && item.monthlyRepeat) {
      const nextDate = addMonths(item.date || item.day, 1);

      const exists = this.items.some(
        x =>
          x.type === 'institution' &&
          x.institution === item.institution &&
          x.date === nextDate &&
          x.monthlyRepeat
      );

      if (!exists) {
        this.add({
          type: 'institution',
          institution: item.institution,
          amount: Number(item.originalAmount ?? 0),
          date: nextDate,
          day: nextDate,
          repeat: 'monthly',
          monthlyRepeat: true,
          paid: false
        });
      }
    }
  }

  this.save();
  return true;
}
toggleCurrent(id) {
  const item = this.items.find(x => x.id === id);
  if (!item) return;

  if (item.type === 'credit' || item.installmentPlan) {
    if (item.type === 'credit') {
      this.normalizeCredit(item);
    } else {
      this.normalizeInstallment(item);
    }

    const current = item.schedule.find(s => !s.paid);

    if (current) {
      current.paid = true;
    }

    if (item.type === 'credit') {
      this.normalizeCredit(item);
    } else {
      this.normalizeInstallment(item);
    }
  } else {
    item.paid = !item.paid;

    if (item.paid) {
item.status = 'paid';
item.paidAmount = Number(item.originalAmount ?? item.amount ?? 0);
item.amount = 0;
      if ('debt' in item) {
        item.debt = 0;
      }

      if (item.type === 'institution' && item.monthlyRepeat) {
        const nextDate = addMonths(item.date || item.day, 1);

        const exists = this.items.some(
          x =>
            x.type === 'institution' &&
            x.institution === item.institution &&
            x.date === nextDate &&
            x.monthlyRepeat
        );

        if (!exists) {
          this.add({
            type: 'institution',
            institution: item.institution,
            amount: Number(item.originalAmount ?? 0),
            date: nextDate,
            day: nextDate,
            repeat: 'monthly',
            monthlyRepeat: true,
            paid: false
          });
        }
      }
    } else {
      item.status = 'waiting';
      item.amount = Number(item.originalAmount ?? item.amount ?? 0);

      if ('debt' in item) {
        item.debt = item.amount;
      }
    }
  }

this.save();
}

processMonthlyPayments() {      // No destructive automatic payment is performed. Dates are calculated from the schedule.
      this.migrate(); this.save();
    }
  }

  window.Engine = new DebtEngine();
})();
