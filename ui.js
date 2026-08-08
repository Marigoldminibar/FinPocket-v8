// ===========================
// ui.js
// FinPocket v2.0
// ===========================

const UI = {

    dashboard() {

        const items = Engine.getAll();

        let totalDebt = 0;
        let totalPaid = 0;
        let upcoming = 0;
        let overdue = 0;

        const today = new Date();

        items.forEach(item => {

            const amount = Number(
                item.amount ||
                item.debt ||
                item.installment ||
                0
            );

            if (item.paid) {

                totalPaid += amount;
                return;

            }

            totalDebt += amount;

            const date =
                item.nextPayment ||
                item.dueDate ||
                item.day;

            if (date) {

                const paymentDate = new Date(date);

                if (paymentDate < today) {

                    overdue++;

                } else {

                    upcoming++;

                }

            }

        });

        document.getElementById("totalDebt").textContent =
            "₺ " + totalDebt.toLocaleString("tr-TR");

        document.getElementById("remaining").textContent =
            "₺ " + (totalIncome - totalDebt).toLocaleString("tr-TR");

        document.getElementById("totalIncome").textContent =
            "₺ " + totalIncome.toLocaleString("tr-TR");

    },

    renderCards() {

        const list = document.getElementById("debtList");

        list.innerHTML = "";

        Engine.getAll().forEach((item, index) => {

            const title =
                item.bank ||
                item.institution ||
                item.name;

            const amount =
                Number(
                    item.amount ||
                    item.debt ||
                    item.installment ||
                    0
                );

            const card = document.createElement("div");

            card.className = "debtItem";

            card.innerHTML = `

            <div class="debtInfo">

                <h4>${title}</h4>

                <p>${this.type(item)}</p>

                <p>${this.date(item)}</p>

            </div>

            <div style="text-align:right">

                <div class="amount">

                    ₺ ${amount.toLocaleString("tr-TR")}

                </div>

                <button onclick="togglePaid(${index})">

                    ${item.paid ? "✅ Ödendi" : "⏳ Bekliyor"}

                </button>

                <button onclick="deleteDebt(${index})">

                    🗑️

                </button>

            </div>

            `;

            list.appendChild(card);

        });

    },

    type(item) {

        switch (item.type) {

            case "institution":
                return "🏢 Kurum";

            case "credit":
                return `🏦 Kredi • ${item.remainingInstallments}/${item.totalInstallments}`;

            case "creditcard":
                return "💳 Kredi Kartı";

            default:
                return "📦 Diğer";

        }

    },

    date(item) {

        return (
            item.nextPayment ||
            item.dueDate ||
            item.day ||
            "-"
        );

    },

    refresh() {

        this.dashboard();

        this.renderCards();

    }

};