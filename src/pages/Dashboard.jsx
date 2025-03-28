import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, query, orderByChild, limitToLast, get } from 'firebase/database';
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
  const readingsCountRef = useRef(0);

  useEffect(() => {
    const sensorsRef = ref(database, 'dati_serra');
    const settingsRef = ref(database, 'settings');
    const notificationsRef = ref(database, 'dati_serra');
    const historyRef = ref(database, 'dati_serra');

    // Initialize with default values
    const defaultData = {
      temperature: { value: 25, min: 18, max: 60 },
      humidity: { value: 60, min: 0, max: 100 },
      light: { value: 75, min: 50, max: 90 }
    };

    setSensorData(defaultData);

    // Fetch recent notifications
    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      const notifData = snapshot.val();
      if (notifData) {
        const notifArray = Object.entries(notifData)
          .map(([key, value]) => ({ id: key, ...value }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);
        setNotifications(notifArray);
      }
    });

    // Fetch chart data (last 10 readings)
    const fetchChartData = async () => {
      try {
        const dataQuery = query(historyRef, orderByChild('timestamp'), limitToLast(20));
        const snapshot = await get(dataQuery);
        const data = snapshot.val();
        
        if (data) {
          const dataArray = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
          const timestamps = dataArray.map(entry => 
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
                data: dataArray.map(entry => Number(entry.temperatura).toFixed(2)),
                borderColor: '#ff4444',
                tension: 0.3,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
              },
              {
                label: 'Umidità',
                data: dataArray.map(entry => Number(entry.umidita).toFixed(2)),
                borderColor: '#33b5e5',
                tension: 0.3,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
              },
              {
                label: 'Luminosità',
                data: dataArray.map(entry => Number(entry.luce).toFixed(2)),
                borderColor: '#ffbb33',
                tension: 0.3,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
              }
            ]
          });
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchChartData();
    const chartInterval = setInterval(fetchChartData, 300000); // Update every 5 minutes

    // Fetch settings and sensor data as before
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const settings = snapshot.val();
      console.log("[Dashboard] Settings data received from Firebase:", settings);
      console.log("[Dashboard] Current sensorData state:", sensorData);
      if (settings) {
        console.log("[Dashboard] Processing settings with values:", {
          temperature: { min: settings.temperature?.min, max: settings.temperature?.max },
          humidity: { min: settings.humidity?.min, max: settings.humidity?.max },
          light: { min: settings.light?.min, max: settings.light?.max }
        });
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
      }
      setIsLoading(false);
    });

    // Subscribe to real-time sensor data and save to Firestore every 10 readings
    const unsubscribeSensors = onValue(sensorsRef, async (snapshot) => {
      const data = snapshot.val();
      console.log("[Dashboard] Raw sensor data received:", data);
      if (data) {
        readingsCountRef.current += 1;
        
        // Log current state before update
        console.log("[Dashboard] Current sensor state:", sensorData);
        
        const newSensorData = {
          temperature: { 
            ...(sensorData?.temperature || {}),
            value: Number(data.temperatura || 25).toFixed(2),
            min: sensorData?.temperature?.min || 18,
            max: sensorData?.temperature?.max || 60
          },
          humidity: { 
            ...(sensorData?.humidity || {}),
            value: Number(data.umidita || 60).toFixed(2),
            min: sensorData?.humidity?.min || 0,
            max: sensorData?.humidity?.max || 100
          },
          light: { 
            ...(sensorData?.light || {}),
            value: Number(data.luce || 75).toFixed(2),
            min: sensorData?.light?.min || 50,
            max: sensorData?.light?.max || 90
          }
        };
        
        console.log("[Dashboard] New sensor data to be set:", newSensorData);
        setSensorData(newSensorData);

        // Update chart data with new reading
        setChartData(prevChartData => {
          if (!prevChartData) {
            // Initialize chart data if it doesn't exist
            return {
              labels: [new Date().toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })],
              datasets: [
                {
                  label: 'Temperatura',
                  data: [Number(data.temperatura).toFixed(2)],
                  borderColor: '#ff4444',
                  tension: 0.3,
                  fill: false,
                  pointRadius: 3,
                  pointHoverRadius: 5
                },
                {
                  label: 'Umidità',
                  data: [Number(data.umidita).toFixed(2)],
                  borderColor: '#33b5e5',
                  tension: 0.3,
                  fill: false,
                  pointRadius: 3,
                  pointHoverRadius: 5
                },
                {
                  label: 'Luminosità',
                  data: [Number(data.luce).toFixed(2)],
                  borderColor: '#ffbb33',
                  tension: 0.3,
                  fill: false,
                  pointRadius: 3,
                  pointHoverRadius: 5
                }
              ]
            };
          }

          // Keep only the last 20 readings
          const labels = [...prevChartData.labels, new Date().toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })].slice(-20);
          const datasets = prevChartData.datasets.map((dataset, index) => ({
            ...dataset,
            data: [...dataset.data, 
              Number(index === 0 ? data.temperatura : index === 1 ? data.umidita : data.luce).toFixed(2)
            ].slice(-20)
          }));

          return { labels, datasets };
        });
        
        // Save to Firestore every 10 readings
        if (readingsCountRef.current >= 10) {
          try {
            const firestoreData = {
              ...data,
              timestamp: serverTimestamp()
            };
            console.log("[Dashboard] Saving to Firestore:", firestoreData);
            await addDoc(collection(firestore, 'sensor_history'), firestoreData);
            console.log("[Dashboard] Successfully saved to Firestore");
            readingsCountRef.current = 0;
          } catch (error) {
            console.error('[Dashboard] Error saving to Firestore:', error);
          }
        }
      }
    });

    return () => {
      unsubscribeSettings();
      unsubscribeSensors();
      unsubscribeNotifications();
      clearInterval(chartInterval);
    };
  }, []);

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

  if (isLoading || !sensorData) {
    return <div className="dashboard"><h2>Caricamento...</h2></div>;
  }

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
              <div key={notif.id} className={`notification-item ${notif.type}`}>
                <span className="notification-time">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </span>
                <span className="notification-message">{notif.message}</span>
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