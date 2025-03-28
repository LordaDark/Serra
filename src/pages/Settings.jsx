import React, { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '../firebase-config';
import '../styles/settings.css';

const Settings = () => {     
  const [settings, setSettings] = useState({
    temperature: { min: 18, max: 60 },
    humidity: { min: 40, max: 80 },
    light: { min: 50, max: 90 }
  });
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsRef = ref(database, 'settings');
      try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
          const settingsData = snapshot.val();
          console.log("[Settings] Fetched settings from Firebase:", settingsData);
          setSettings(settingsData);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();

    // Get saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleSettingChange = async (sensor, type, value) => {
    const newSettings = {
      ...settings,
      [sensor]: {
        ...settings[sensor],
        [type]: Number(value)
      }
    };
    
    setSettings(newSettings);
    
    try {
      console.log("[Settings] Saving new settings to Firebase:", newSettings);
      await set(ref(database, 'settings'), newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleReset = async () => {
    const defaultSettings = {
      temperature: { min: 18, max: 60 },
      humidity: { min: 40, max: 80 },
      light: { min: 50, max: 90 }
    };

    setSettings(defaultSettings);
    
    try {
      await set(ref(database, 'settings'), defaultSettings);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  const getSensorLabel = (sensor) => {
    switch(sensor) {
      case 'temperature': return 'Temperatura';
      case 'humidity': return 'Umidità';
      case 'light': return 'Luminosità';
      default: return sensor;
    }
  };

  return (
    <div className="settings-page">
      <h2>Impostazioni</h2>
      
      <div className="settings-grid">
        {Object.entries(settings).map(([sensor, values]) => (
          <div key={sensor} className="setting-card">
            <h3>Soglie {getSensorLabel(sensor)}</h3>
            <div className="setting-controls">
              <div className="setting-input">
                <label>Min:</label>
                <input
                  type="number"
                  value={values.min}
                  onChange={(e) => handleSettingChange(sensor, 'min', e.target.value)}
                />
                <span>{sensor === 'temperature' ? '°C' : '%'}</span>
              </div>
              <div className="setting-input">
                <label>Max:</label>
                <input
                  type="number"
                  value={values.max}
                  onChange={(e) => handleSettingChange(sensor, 'max', e.target.value)}
                />
                <span>{sensor === 'temperature' ? '°C' : '%'}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="theme-section">
          <h3>Tema</h3>
          <div className="theme-controls">
            <button
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              Chiaro 🌞
            </button>
            <button
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              Scuro 🌙
            </button>
          </div>
        </div>
      </div>

      <button className="reset-btn" onClick={handleReset}>
        🔄 Reset Impostazioni
      </button>
    </div>
  );
};

export default Settings;