import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics"; // Aggiunto

// Configurazione di Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCzLzAjJADirLhZ53olhr-IJsR4IiRyZAU",
    authDomain: "serra-automatica-itis.firebaseapp.com",
    databaseURL: "https://serra-automatica-itis-default-rtdb.firebaseio.com/",
    projectId: "serra-automatica-itis",
    storageBucket: "serra-automatica-itis.firebasestorage.app", // ⚠️ Corretto
    messagingSenderId: "470825100170",
    appId: "1:470825100170:web:3cf77fea00b5e2a7765e73",
    measurementId: "G-HTZKRQWG6J"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const firestore = getFirestore(app);
const analytics = getAnalytics(app); // Aggiunto

export { app, database, firestore, analytics };
