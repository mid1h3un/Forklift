import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [activeView, setActiveView] = useState('Dashboard');
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/api/latest");
        setData(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000); // refresh every 2s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: '220px',
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '20px 0',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ padding: '0 20px', margin: '0 0 30px 0', fontSize: '20px' }}>
          PLC System
        </h2>
        
        {['Dashboard', 'MIMIC', 'Reports'].map((item) => (
          <div
            key={item}
            onClick={() => setActiveView(item)}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              backgroundColor: activeView === item ? '#34495e' : 'transparent',
              borderLeft: activeView === item ? '4px solid #3498db' : '4px solid transparent',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (activeView !== item) {
                e.currentTarget.style.backgroundColor = '#34495e';
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== item) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px', backgroundColor: '#ecf0f1', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0', color: '#2c3e50' }}>
            {activeView}
          </h2>
          {activeView === 'Dashboard' && (
            <div style={{
              fontSize: '12px',
              color: '#7f8c8d',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: data ? '#27ae60' : '#e74c3c',
                animation: data ? 'pulse 2s infinite' : 'none'
              }} />
              {data ? 'Live' : 'Connecting...'}
            </div>
          )}
        </div>
        
        {activeView === 'Dashboard' && (
          <div>
            {data ? (
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '16px', margin: '0' }}>
                  <b>STATUS:</b>{' '}
                  <span style={{
                    color: data.status === 'Running' ? '#27ae60' : '#e74c3c',
                    fontWeight: 'bold'
                  }}>
                    {data.status}
                  </span>
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p>Loading data...</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'MIMIC' && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p>MIMIC view content will be displayed here</p>
          </div>
        )}

        {activeView === 'Reports' && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p>Reports content will be displayed here</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}