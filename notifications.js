// ===========================
// notifications.js
// FinPocket v2.0
// ===========================

const Notifications = {

    check() {

        const today = new Date();

        const items = Engine.getAll();

        let todayList = [];
        let tomorrowList = [];
        let overdueList = [];

        items.forEach(item => {

            if (item.paid) return;

            const value =
                item.amount ||
                item.debt ||
                item.installment ||
                0;

            const title =
                item.bank ||
                item.institution ||
                item.name;

            const dateString =
                item.nextPayment ||
                item.dueDate ||
                item.day;

            if (!dateString) return;

            const paymentDate = new Date(dateString);

            const diff = Math.floor(
                (paymentDate - today) / 86400000
            );

            if (diff < 0) {

                overdueList.push({

                    title,

                    value

                });

            }

            else if (diff === 0) {

                todayList.push({

                    title,

                    value

                });

            }

            else if (diff === 1) {

                tomorrowList.push({

                    title,

                    value

                });

            }

        });

        console.clear();

        console.log("====== FinPocket ======");

        console.log("Bugün :", todayList);

        console.log("Yarın :", tomorrowList);

        console.log("Geciken :", overdueList);

    },

    browserPermission() {

        if (!("Notification" in window)) return;

        if (Notification.permission === "default") {

            Notification.requestPermission();

        }

    },

    send(title, body) {

        if (Notification.permission !== "granted") return;

        new Notification(title, {

            body,

            icon: "icon-192.png"

        });

    },

    run() {

        this.browserPermission();

        const today = new Date();

        Engine.getAll().forEach(item => {

            if (item.paid) return;

            const date =
                item.nextPayment ||
                item.dueDate ||
                item.day;

            if (!date) return;

            const diff = Math.floor(

                (new Date(date) - today) /

                86400000

            );

            if (diff === 0) {

                this.send(

                    "Bugün ödeme var",

                    (item.bank ||

                        item.institution ||

                        item.name) +

                    " ödeme günü."

                );

            }

        });

    }

};

Notifications.run();