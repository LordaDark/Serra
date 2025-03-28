import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase-config';
import { Line } from 'react-chartjs-2';
import Card from '../components/Card';
import '../styles/charts.css';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Charts = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [chartData, setChartData] = useState({});

  const fetchData = async () => {
    const points = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const sensorsRef = collection(firestore, 'sensor_history');
    const dataQuery = query(sensorsRef, orderBy('timestamp', 'desc'), limit(points));
    
    try {
      console.log('[Charts] Fetching data for timeRange:', timeRange, 'points:', points);
      const snapshot = await getDocs(dataQuery);
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      console.log('[Charts] Raw data received:', data);
      
      if (data) {
        const timestamps = Object.values(data).map(entry => {
          let timestamp;
          if (typeof entry.timestamp === 'string') {
            timestamp = new Date(entry.timestamp);
          } else if (entry.timestamp?.toDate) {
            timestamp = entry.timestamp.toDate();
          } else {
            console.warn('[Charts] Invalid timestamp format:', entry.timestamp);
            return null;
          }
          return timeRange === '24h' ? 
            timestamp.toLocaleTimeString() :
            timestamp.toLocaleDateString();
        }).filter(Boolean);
        console.log('[Charts] Processed timestamps:', timestamps);
        
        const sensorMappings = {
          temperature: { field: 'temperatura', label: 'Temperatura', color: '#ff4444' },
          humidity: { field: 'umidita', label: 'Umidità', color: '#33b5e5' },
          light: { field: 'luce', label: 'Luminosità', color: '#ffbb33' }
        };
        
        const sensorData = {};
        
        Object.entries(sensorMappings).forEach(([key, config]) => {
          const values = Object.values(data).map(entry => entry[config.field]);
          console.log(`[Charts] Processed ${key} values:`, values);
          
          sensorData[key] = {
            labels: timestamps,
            datasets: [{
              label: config.label,
              data: values,
              borderColor: config.color,
              tension: 0.4
            }]
          };
        });
        
        console.log('[Charts] Final chart data:', sensorData);
        setChartData(sensorData);
      } else {
        console.log('[Charts] No data received from query');
      }
    } catch (error) {
      console.error('[Charts] Error fetching historical data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="charts-page">
      <h2>Grafici Storici</h2>
      
      <div className="time-filter">
        <button 
          className={`filter-btn ${timeRange === '24h' ? 'active' : ''}`}
          onClick={() => setTimeRange('24h')}
        >
          Ultime 24h
        </button>
        <button 
          className={`filter-btn ${timeRange === '7d' ? 'active' : ''}`}
          onClick={() => setTimeRange('7d')}
        >
          Ultima settimana
        </button>
        <button 
          className={`filter-btn ${timeRange === '30d' ? 'active' : ''}`}
          onClick={() => setTimeRange('30d')}
        >
          Ultimo mese
        </button>
      </div>

      <div className="charts-grid">
        {Object.entries(chartData).map(([sensor, data]) => (
          <Card key={sensor} title={
            sensor === 'temperature' ? '📈 Grafico Temperatura' :
            sensor === 'humidity' ? '🌡️ Grafico Umidità' :
            '📊 Grafico Luce'
          }>
            <div className="chart-container">
              <Line data={data} options={chartOptions} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Charts;