import React, { useState, useEffect } from "react";
import "./Serra.css"; // Importa il file CSS personalizzato
import { database } from "../firebase-config";
import { ref, onValue } from "firebase/database";
import { FaTemperatureHigh, FaTint, FaSun } from "react-icons/fa"; // Importa le icone

const Serra = () => {
    const [dati, setDati] = useState({ temperatura: 0, umidita: 0, luce: 0 });
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState("dark");

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    useEffect(() => {
        const datiRef = ref(database, "/dati_serra");
        onValue(
            datiRef,
            (snapshot) => {
                const data = snapshot.val();
                console.log("Dati ricevuti:", data);
                if (data) {
                    setDati({
                        temperatura: data.temperatura || 0,
                        umidita: data.umidita || 0,
                        luce: data.luce || 0,
                    });
                    setLoading(false);
                }
            },
            (error) => {
                console.error("Errore nel recupero dati:", error);
                setLoading(false);
            }
        );
    }, []);

    // Funzione per determinare il colore della barra in base ai valori
    const getColorClass = (tipo, valore) => {
        if (tipo === "temperatura") {
            if (valore < 5 || valore > 40) return "red";
            if (valore < 10 || valore > 35) return "orange";
            return "green";
        }
        if (tipo === "umidita") {
            if (valore < 20 || valore > 90) return "red";
            if (valore < 30 || valore > 80) return "orange";
            return "green";
        }
        if (tipo === "luce") {
            if (valore < 200 || valore > 100000) return "red";
            if (valore < 1000 || valore > 50000) return "orange";
            return "green";
        }
        return "green";
    };

    return (
        <div className="app" data-theme={theme}>
            <button onClick={toggleTheme} className="theme-toggle">
                {theme === "dark" ? "Tema Chiaro" : "Tema Scuro"}
            </button>
            <div className="container">
                <h1>Monitoraggio valori ambientali</h1>
                {loading ? (
                    <p className="loading">Caricamento dati...</p>
                ) : (
                    <div className="dati-container">
                        <div className="dato">
                            <p>
                                <FaTemperatureHigh /> <strong>Temperatura:</strong>{" "}
                                <span id="temperatura">{dati.temperatura}°C</span>
                            </p>
                            <div className="progress-bar">
                                <div
                                    className={`progress ${getColorClass("temperatura", dati.temperatura)}`}
                                    style={{ width: `${dati.temperatura}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="dato">
                            <p>
                                <FaTint /> <strong>Umidità:</strong>{" "}
                                <span id="umidita">{dati.umidita}%</span>
                            </p>
                            <div className="progress-bar">
                                <div
                                    className={`progress ${getColorClass("umidita", dati.umidita)}`}
                                    style={{ width: `${dati.umidita}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="dato">
                            <p>
                                <FaSun /> <strong>Luce:</strong>{" "}
                                <span id="luce">{dati.luce} lux</span>
                            </p>
                            <div className="progress-bar">
                                <div
                                    className={`progress ${getColorClass("luce", dati.luce)}`}
                                    style={{ width: `${dati.luce / 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Serra;
