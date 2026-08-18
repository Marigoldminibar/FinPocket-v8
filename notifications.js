// ===========================
// FinPocket v2.0
// Bildirim Sistemi
// ===========================

const Notifications = {

    check() {

        const today = new Date();
        const items = Engine.getAll();
        const notifiedKey = 'fp_notified_payments';
        const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');        const todayList = [];
        const tomorrowList = [];
        const overdueList = [];

        items.forEach(item => {

            if (item.paid) return;

            const value = Number(
                item.amount ||
                item.debt ||
                item.installment ||
                0
            );

            const title =
                item.bank ||
                item.institution ||
                item.name ||
                'Borç';

            const dateString =
                item.nextPayment ||
                item.dueDate ||
                item.day;

            if (!dateString) return;

            const paymentDate = new Date(
                String(dateString).includes('-')
                    ? dateString + 'T12:00:00'
                    : dateString
            );

            if (Number.isNaN(paymentDate.getTime())) return;

            paymentDate.setHours(0, 0, 0, 0);

            const compareToday = new Date(today);
            compareToday.setHours(0, 0, 0, 0);

            const diff = Math.round(
                (paymentDate - compareToday) / 86400000
            );

const data = {
    id: item.id || title,
    title,
    value,
    date: String(dateString)
};
const notificationId = `${data.id}_${data.date}_${diff}`;


data.notificationId = notificationId;
data.alreadyNotified = notified.includes(notificationId);

if (diff < 0) {
                overdueList.push(data);
            } else if (diff === 0) {
                todayList.push(data);
            } else if (diff === 1) {
                tomorrowList.push(data);
            }

        });

        return {
            today: todayList,
            tomorrow: tomorrowList,
            overdue: overdueList
        };
    },

    // Bildirim iznini yalnızca kullanıcı istediğinde çağıracağız.
    requestPermission() {

        if (!('Notification' in window)) {
            console.log('Tarayıcı bildirimleri desteklemiyor.');
            return Promise.resolve('unsupported');
        }

        if (Notification.permission === 'granted') {
            return Promise.resolve('granted');
        }

        if (Notification.permission === 'denied') {
            console.log('Bildirim izni engellenmiş.');
            return Promise.resolve('denied');
        }

        return Notification.requestPermission();
    },

    send(title, body) {

        if (!('Notification' in window)) return;

        if (Notification.permission !== 'granted') return;

        new Notification(title, {
            body,
            icon: './icons/icon-192.png'
        });

    },
    markAsNotified(notificationId) {

    const key = 'fp_notified_payments';

    const list = JSON.parse(
        localStorage.getItem(key) || '[]'
    );

    if (!list.includes(notificationId)) {
        list.push(notificationId);
        localStorage.setItem(key, JSON.stringify(list));
    }

},

    run() {

        // ÖNEMLİ:
        // Burada artık bildirim izni İSTENMİYOR.
        // Uygulama açılışında popup çıkmayacak.

        const result = this.check();

        // Bugün ödeme varsa bildirim
        result.today
    .filter(item => !item.alreadyNotified)
    .forEach(item => {

this.send(
    '💳 Bugün ödeme var',
    `${item.title} ödeme günü.`
);

this.markAsNotified(item.notificationId);
        });

        // Geciken ödeme varsa bildirim
        result.overdue
    .filter(item => !item.alreadyNotified)
    .forEach(item => {

            this.send(
                '⚠️ Geciken ödeme',
                `${item.title} ödemesi gecikmiş.`
            );

            this.markAsNotified(item.notificationId);

        });
        // Yarın ödeme varsa bildirim
result.tomorrow
    .filter(item => !item.alreadyNotified)
    .forEach(item => {

    this.send(
        '📅 Yarın ödeme var',
        `${item.title} için yarın ödeme günü.`
    );

    this.markAsNotified(item.notificationId);

});

        console.log(
            'FinPocket Bildirim Kontrolü:',
            result
        );

    }

};

window.Notifications = Notifications;

// Uygulama açılışında sadece kontrol yapılır.
// Bildirim izni istenmez.
Notifications.run();