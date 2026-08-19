import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";


const firebaseConfig = {
    apiKey: "AIzaSyAST0JcpIsIt0LAO1tKCfC8IGzsQpDCzqE",
    authDomain: "finpocket-1bb98.firebaseapp.com",
    projectId: "finpocket-1bb98",
    storageBucket: "finpocket-1bb98.firebasestorage.app",
    databaseURL: "https://finpocket-1bb98-default-rtdb.europe-west1.firebasedatabase.app",
    messagingSenderId: "929372485925",
    appId: "1:929372485925:web:214198c36fc06be7f802cc"
};


const app = initializeApp(firebaseConfig);


// Firestore
const db = getFirestore(app);


// Realtime Database
const rtdb = getDatabase(app);


// Uygulamanın diğer bölümlerinden erişebilmek için
window.finPocketFirebase = {
    app,
    db,
    rtdb
};


console.log("🔥 FinPocket Firebase hazır");
console.log("🔥 Realtime Database hazır");