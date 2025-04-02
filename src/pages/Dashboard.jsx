import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, query, orderByChild, limitToLast, get, set } from 'firebase/database';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { database, firestore } from '../firebase-config';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import '../styles/dashboard.css';
import '../styles/charts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [sensorData, setSensorData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartDataArray, setChartDataArray] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const readingsCountRef = useRef(0);
  const lastNotificationRef = useRef(null);

  useEffect(() => {
    console.log("[Dashboard] Inizializzazione componente...");
    setIsLoading(true);
    const sensorsRef = ref(database, 'dati_serra');
    const settingsRef = ref(database, 'settings');
    const notificationsRef = ref(database, 'dati_serra');
    const historyRef = ref(database, 'dati_serra');
    console.log("[Dashboard] Riferimenti database inizializzati");

    // Initialize with default values
    const defaultData = {
      temperature: { value: 25, min: 18, max: 60 },
      humidity: { value: 60, min: 0, max: 100 },
      light: { value: 75, min: 50, max: 90 }
    };

    console.log("[Dashboard] Impostazione dati predefiniti:", defaultData);
    setSensorData(defaultData);
    setIsLoading(false);
    
    // Verifica se i dati esistono nel database e, se necessario, inizializzali
    const checkAndInitializeData = async () => {
      try {
        const sensorsSnapshot = await get(sensorsRef);
        if (!sensorsSnapshot.exists()) {
          console.log("[Dashboard] Nessun dato sensori trovato, inizializzazione...");
          const exampleSensorData = {
            temperatura: 25,
            umidita: 60,
            luce: 75,
            timestamp: Date.now()
          };
          
          await set(ref(database, 'dati_serra'), exampleSensorData);
          console.log("[Dashboard] Dati sensori inizializzati con successo");
        }

        const settingsSnapshot = await get(settingsRef);
        if (!settingsSnapshot.exists()) {
          console.log("[Dashboard] Nessuna impostazione trovata, inizializzazione...");
          const exampleSettings = {
            temperature: { min: 18, max: 60 },
            humidity: { min: 0, max: 100 },
            light: { min: 50, max: 90 }
          };
          
          await set(ref(database, 'settings'), exampleSettings);
          console.log("[Dashboard] Impostazioni inizializzate con successo");
        } else {
          console.log("[Dashboard] Impostazioni esistenti trovate");
        }
      } catch (error) {
        console.error("[Dashboard] Errore durante l'inizializzazione dei dati:", error);
      }
    };
    
    checkAndInitializeData();

    // Sistema di notifiche avanzato
    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      console.log("[Dashboard] Ricevuti nuovi dati notifiche");
      const notifData = snapshot.val();
      if (notifData) {
        const notifArray = Object.entries(notifData)
          .map(([key, value]) => {
            const timestamp = value.timestamp ? new Date(value.timestamp) : new Date();
            const isValidDate = !isNaN(timestamp.getTime());
            
            if (!isValidDate) {
              console.warn(`[Dashboard] Data non valida per la notifica ${key}:`, value.timestamp);
            }
            
            return {
              id: key,
              ...value,
              timestamp: isValidDate ? timestamp.getTime() : Date.now(),
              priority: calculatePriority(value),
              isNew: !lastNotificationRef.current || (isValidDate && timestamp.getTime() > lastNotificationRef.current),
              isGraphRelated: value.type === 'graph_update'
            };
          })
          .sort((a, b) => {
            // Prima le notifiche nuove
            if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
            // Poi le notifiche relative al grafico
            if (a.isGraphRelated !== b.isGraphRelated) return a.isGraphRelated ? -1 : 1;
            // Infine per priorità e timestamp
            if (a.priority !== b.priority) return b.priority - a.priority;
            return b.timestamp - a.timestamp;
          })
          .slice(0, 3); // Mantieni solo le prime 3 notifiche

        console.log("[Dashboard] Notifiche processate:", notifArray.length);

        // Aggiorna il contatore delle notifiche nuove
        const newNotifications = notifArray.filter(n => n.isNew).length;
        setNotificationCount(prev => prev + newNotifications);
        
        // Aggiorna il timestamp dell'ultima notifica
        if (notifArray.length > 0) {
          lastNotificationRef.current = Math.max(...notifArray.map(n => n.timestamp));
          console.log("[Dashboard] Ultimo timestamp notifica aggiornato:", new Date(lastNotificationRef.current).toLocaleString('it-IT'));
        }

        setNotifications(notifArray);
        
        // Log delle notifiche importanti
        const criticalNotifications = notifArray.filter(n => n.priority > 2);
        if (criticalNotifications.length > 0) {
          console.warn("[Dashboard] Notifiche critiche rilevate:", criticalNotifications);
        }
      } else {
        console.log("[Dashboard] Nessuna notifica disponibile");
      }
    });

    // Gestione dati del grafico in tempo reale

    const updateChartData = (newData) => {
      setChartDataArray(prevData => {
        // Aggiungi il nuovo dato all'array
        const updatedData = [...prevData, newData];
        // Mantieni solo gli ultimi 15 record
        const slicedData = updatedData.slice(-15);
        
        // Aggiorna il grafico con i nuovi dati
        const timestamps = slicedData.map(entry => 
          new Date(entry.timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        );

        setChartData({
          labels: timestamps,
          datasets: [
            {
              label: 'Temperatura',
              data: slicedData.map(entry => Number(entry.temperatura).toFixed(2)),
              borderColor: '#ff4444',
              tension: 0.3,
              fill: false,
              pointRadius: 3,
              pointHoverRadius: 5
            },
            {
              label: 'Umidità',
              data: slicedData.map(entry => Number(entry.umidita).toFixed(2)),
              borderColor: '#33b5e5',
              tension: 0.3,
              fill: false,
              pointRadius: 3,
              pointHoverRadius: 5
            },
            {
              label: 'Luminosità',
              data: slicedData.map(entry => Number(entry.luce).toFixed(2)),
              borderColor: '#ffbb33',
              tension: 0.3,
              fill: false,
              pointRadius: 3,
              pointHoverRadius: 5
            }
          ]
        });

        return slicedData;
      });
    };

    // Carica i dati iniziali e imposta il listener per gli aggiornamenti in tempo reale
    const initializeChartData = async () => {
      try {
        // Carica gli ultimi 15 record
        const initialDataQuery = query(historyRef, orderByChild('timestamp'), limitToLast(15));
        const snapshot = await get(initialDataQuery);
        const initialData = snapshot.val();

        if (initialData) {
          const dataArray = Object.values(initialData)
            .sort((a, b) => a.timestamp - b.timestamp);
          setChartDataArray(dataArray);
          updateChartData(dataArray[dataArray.length - 1]);
        }

        // Imposta il listener per gli aggiornamenti in tempo reale
        onValue(sensorsRef, (snapshot) => {
          const newData = snapshot.val();
          if (newData) {
            updateChartData({
              ...newData,
              timestamp: Date.now()
            });
          }
        });
      } catch (error) {
        console.error('Errore durante l\'inizializzazione dei dati del grafico:', error);
      }
    };

    initializeChartData();

    // Fetch settings and sensor data
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const settings = snapshot.val();
      if (settings) {
        setSensorData(prevData => ({
          temperature: {
            value: prevData?.temperature?.value || 25,
            min: settings.temperature?.min || 18,
            max: settings.temperature?.max || 60
          },
          humidity: {
            value: prevData?.humidity?.value || 60,
            min: settings.humidity?.min || 0,
            max: settings.humidity?.max || 100
          },
          light: {
            value: prevData?.light?.value || 75,
            min: settings.light?.min || 50,
            max: settings.light?.max || 90
          }
        }));
      } else {
        console.log("[Dashboard] Nessuna impostazione ricevuta");
      }
    });

    // Subscribe to real-time sensor data
    const unsubscribeSensors = onValue(sensorsRef, async (snapshot) => {
      try {
        console.log("[Dashboard] Ricezione nuovi dati sensori");
        const data = snapshot.val();
        if (data) {
          readingsCountRef.current += 1;
          
          const newSensorData = {
            temperature: {
              ...(sensorData?.temperature || {}),
              value: Number(data.temperatura || 25).toFixed(2)
            },
            humidity: {
              ...(sensorData?.humidity || {}),
              value: Number(data.umidita || 60).toFixed(2)
            },
            light: {
              ...(sensorData?.light || {}),
              value: Number(data.luce || 75).toFixed(2)
            }
          };

          console.log("[Dashboard] Aggiornamento dati sensori:", newSensorData);
          setSensorData(newSensorData);
          setIsLoading(false);

          // Save to Firestore every 10 readings
          if (readingsCountRef.current >= 10) {
            try {
              await addDoc(collection(firestore, 'sensor_history'), {
                ...data,
                timestamp: serverTimestamp()
              });
              readingsCountRef.current = 0;
            } catch (error) {
              console.error('[Dashboard] Error saving to Firestore:', error);
            }
          }
        } else {
          console.log("[Dashboard] Nessun dato ricevuto dai sensori");
        }
      } catch (error) {
        console.error("[Dashboard] Errore durante la lettura dei dati dei sensori:", error);
      }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeSensors();
      unsubscribeNotifications();

    };
  }, []);

  const calculatePriority = (notification) => {
    if (!notification) return 0;
    // Calcola la priorità basata su tipo, valori e relazione con il grafico
    let priority = 0;
    
    // Priorità base per tipo di notifica
    switch (notification.type) {
      case 'danger': priority = 3; break;
      case 'warning': priority = 2; break;
      case 'success': priority = 1; break;
      default: priority = 0;
    }
    
    // Aumenta la priorità se la notifica è relativa al grafico
    if (notification.message && (
      notification.message.includes('temperatura') ||
      notification.message.includes('umidità') ||
      notification.message.includes('luminosità')
    )) {
      notification.type = 'graph_update';
      priority += 1;
    }
    
    return priority;
  };

  const getStatus = (value, min, max) => {
    if (value < min || value > max) return 'danger';
    const threshold = (max - min) * 0.1;
    if (value <= min + threshold || value >= max - threshold) return 'warning';
    return 'success';
  };

  const getSensorLabel = (sensor) => {
    switch(sensor) {
      case 'temperature': return 'Temperatura';
      case 'humidity': return 'Umidità';
      case 'light': return 'Luminosità';
      default: return sensor;
    }
  };

  const getStatusEmoji = (status) => {
    switch(status) {
      case 'danger': return '🔴';
      case 'warning': return '🟡';
      case 'success': return '🟢';
      default: return '⚪';
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
              if (context.dataset.label === 'Temperatura') {
                label += '°C';
              } else {
                label += '%';
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          stepSize: 5,
          callback: function(value) {
            return value.toFixed(1);
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (isLoading || !sensorData) {
    return <div className="dashboard"><h2>Caricamento...</h2></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Serra Automatica</h2>
        <p>Monitoraggio in tempo reale dei parametri ambientali</p>
      </div>

      <div className="progress-section">
        <h3 className="data-title">Stato dei Sensori</h3>
        {Object.entries(sensorData).map(([sensor, data]) => (
          <div key={sensor} className="progress-row">
            <div className="progress-label">
              {getSensorLabel(sensor)}
              <span className="status-indicator">{getStatusEmoji(getStatus(data.value, data.min, data.max))}</span>
            </div>
            <ProgressBar
              value={data.value}
              min={data.min}
              max={data.max}
              status={getStatus(data.value, data.min, data.max)}
            />
            <div className="progress-value">
              {data.value}{sensor === 'temperature' ? '°C' : '%'}
            </div>
          </div>
        ))}
      </div>

      {chartData && (
        <div className="quick-chart">
          <h3>Ultimi dati ricevuti</h3>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      <div className="notifications-section">
        <h3>Notifiche recenti</h3>
        {notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`notification-item ${notif.type} ${notif.isNew ? 'new' : ''}`}
                onClick={() => {
                  if (notif.isNew) {
                    setNotificationCount(prev => Math.max(0, prev - 1));
                    const updatedNotifications = notifications.map(n => 
                      n.id === notif.id ? { ...n, isNew: false } : n
                    );
                    setNotifications(updatedNotifications);
                  }
                }}
              >
                <span className="notification-time">
                  {new Date(notif.timestamp).toLocaleString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </span>
                <span className="notification-message">{notif.message}</span>
                {notif.isNew && <span className="notification-badge">Nuovo</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-notifications">Nessuna notifica recente</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;