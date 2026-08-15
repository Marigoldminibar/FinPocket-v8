// ===========================
// storage.js
// FinPocket v2.0
// ===========================

const DEVICE_ID_KEY = 'fp_device_id';
const DEVICE_ID = localStorage.getItem(DEVICE_ID_KEY) || (() => { const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'device_' + Date.now() + '_' + Math.random().toString(36).slice(2); localStorage.setItem(DEVICE_ID_KEY,id); return id; })();

function safeJSONParse(value, fallback = null) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function safeStorageGet(key, fallback = null) {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

const Storage = {

    keys: {
        debts: 'fp_engine_' + DEVICE_ID,
        income: 'fp_income_' + DEVICE_ID,
        settings: 'fp_settings_' + DEVICE_ID
    },

    loadDebts() {
    return safeJSONParse(
        safeStorageGet(this.keys.debts),
        []
    );
},

saveDebts(data) {
    return safeStorageSet(
        this.keys.debts,
        JSON.stringify(data)
    );
},

    loadIncome() {

        return Number(
            localStorage.getItem(this.keys.income)
        ) || 0;

    },

    saveIncome(value) {

        localStorage.setItem(
            this.keys.income,
            value
        );

    },

    loadSettings() {

        return JSON.parse(
            localStorage.getItem(this.keys.settings)
        ) || {

            theme:"dark",

            currency:"TRY",

            pin:""

        };

    },

    saveSettings(settings){

        localStorage.setItem(

            this.keys.settings,

            JSON.stringify(settings)

        );

    },

    backup(){

        const data={

            debts:this.loadDebts(),

            income:this.loadIncome(),

            settings:this.loadSettings(),

            version:"2.0",

            created:new Date().toISOString()

        };

        const blob=new Blob(

            [

                JSON.stringify(data,null,2)

            ],

            {

                type:"application/json"

            }

        );

        const url=URL.createObjectURL(blob);

        const a=document.createElement("a");

        a.href=url;

        a.download="FinPocket.backup";

        a.click();

        URL.revokeObjectURL(url);

    },

    restore(file){

        const reader=new FileReader();

        reader.onload=e=>{

            const data=JSON.parse(e.target.result);

            this.saveDebts(data.debts||[]);

            this.saveIncome(data.income||0);

            this.saveSettings(data.settings||{});

            location.reload();

        };

        reader.readAsText(file);

    },

    reset(){

        if(!confirm("Tüm veriler silinsin mi?")) return;

        localStorage.removeItem(this.keys.debts);

        localStorage.removeItem(this.keys.income);

        localStorage.removeItem(this.keys.settings);

        location.reload();

    }

};