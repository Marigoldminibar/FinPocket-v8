// ===========================
// FinPocket
// Bildirim Sistemi
// ===========================

const Notifications = {

    storageKey() {
        const deviceId = localStorage.getItem('fp_device_id') || 'default';
        return `fp_notified_payments_${deviceId}`;
    },

    enabledKey() {
        const deviceId = localStorage.getItem('fp_device_id') || 'default';
        return `fp_notifications_enabled_${deviceId}`;
    },

    isEnabled() {
        return localStorage.getItem(this.enabledKey()) === '1';
    },

    setEnabled(enabled) {
        localStorage.setItem(this.enabledKey(), enabled ? '1' : '0');
        return !!enabled;
    },

    readNotified() {
        try {
            const value = JSON.parse(localStorage.getItem(this.storageKey()) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_) {
            return [];
        }
    },

    markAsNotified(notificationId) {
        const list = this.readNotified();
        if (!list.includes(notificationId)) {
            list.push(notificationId);
            // Son 500 bildirimi tut; localStorage gereksiz büyümesin.
            localStorage.setItem(this.storageKey(), JSON.stringify(list.slice(-500)));
        }
    },

    check() {
        const today = new Date();
        const items = Engine.getAll();
        const notified = this.readNotified();
        const todayList = [];
        const tomorrowList = [];
        const overdueList = [];

        const compareToday = new Date(today);
        compareToday.setHours(0, 0, 0, 0);

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

            const diff = Math.round(
                (paymentDate - compareToday) / 86400000
            );

            const data = {
                id: item.id || title,
                title,
                value,
                date: String(dateString),
                notificationId: `${item.id || title}_${dateString}_${diff}`
            };

            data.alreadyNotified = notified.includes(data.notificationId);

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

    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('Bu ortam web bildirimlerini desteklemiyor.');
            return 'unsupported';
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        if (Notification.permission === 'denied') {
            console.log('Bildirim izni engellenmiş.');
            return 'denied';
        }

        try {
            return await Notification.requestPermission();
        } catch (error) {
            console.warn('Bildirim izni alınamadı:', error);
            return 'denied';
        }
    },

    async send(title, body) {
        if (!this.isEnabled()) return false;

        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return false;
        }

        const options = {
            body,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: `finpocket-${title}`,
            renotify: false,
            data: { url: './' }
        };

        // PWA/HTTPS ortamında Service Worker bildirimi kullanılır.
        // iOS Home Screen uygulamasında doğru yöntem budur.
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, options);
                return true;
            } catch (error) {
                console.warn('Service Worker bildirimi başarısız:', error);
            }
        }

        // file:// veya SW kullanılamayan masaüstü ortamı için fallback.
        try {
            new Notification(title, options);
            return true;
        } catch (error) {
            console.warn('Web bildirimi oluşturulamadı:', error);
            return false;
        }
    },

    async run() {
        const result = this.check();

        if (!this.isEnabled()) {
            console.log('FinPocket bildirimleri kapalı.');
            return result;
        }

        const sendAndMark = async (item, title, body) => {
            if (item.alreadyNotified) return;

            // Bildirim gerçekten gönderilirse işaretle.
            // İzin yoksa bildirim kaybolmasın; kullanıcı sonradan izin verebilsin.
            const sent = await this.send(title, body);
            if (sent) {
                this.markAsNotified(item.notificationId);
            }
        };

        for (const item of result.today) {
            await sendAndMark(
                item,
                '💳 Bugün ödeme var',
                `${item.title} ödeme günü.`
            );
        }

        for (const item of result.overdue) {
            await sendAndMark(
                item,
                '⚠️ Geciken ödeme',
                `${item.title} ödemesi gecikmiş.`
            );
        }

        for (const item of result.tomorrow) {
            await sendAndMark(
                item,
                '📅 Yarın ödeme var',
                `${item.title} için yarın ödeme günü.`
            );
        }

        console.log('FinPocket Bildirim Kontrolü:', result);
        return result;
    }

};

window.Notifications = Notifications;

// Açılışta sadece kontrol edilir. İzin kullanıcı butonuna bastığında istenir.
Notifications.run().catch(error => {
    console.warn('Bildirim kontrolü başarısız:', error);
});
