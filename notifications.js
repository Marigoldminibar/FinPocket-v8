// ===========================
// FinPocket v2.0
// Bildirim Sistemi
// ===========================

const Notifications = {

    check() {

        const today = new Date();
        const items = Engine.getAll();

        const todayList = [];
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
                title,
                value
            };

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

    run() {

        // ÖNEMLİ:
        // Burada artık bildirim izni İSTENMİYOR.
        // Uygulama açılışında popup çıkmayacak.

        const result = this.check();

        // Bugün ödeme varsa bildirim
        result.today.forEach(item => {

            this.send(
                '💳 Bugün ödeme var',
                `${item.title} ödeme günü.`
            );

        });

        // Geciken ödeme varsa bildirim
        result.overdue.forEach(item => {

            this.send(
                '⚠️ Geciken ödeme',
                `${item.title} ödemesi gecikmiş.`
            );

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