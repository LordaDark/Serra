import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics"; // Aggiunto

// Configurazione di Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBfW8GbRcfUPStmxqx9M_CVI1_SKBkXPBY",
    authDomain: "serra-domotica-bonsi.firebaseapp.com",
    databaseURL: "https://serra-domotica-bonsi-default-rtdb.firebaseio.com",
    projectId: "serra-domotica-bonsi",
    storageBucket: "serra-domotica-bonsi.firebasestorage.app",
    messagingSenderId: "161102213524",
    appId: "1:161102213524:web:cf62c3cff64933918d9f81",
    measurementId: "G-FEVJEEGVNE"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const firestore = getFirestore(app);
const analytics = getAnalytics(app); // Aggiunto

export { app, database, firestore, analytics };
