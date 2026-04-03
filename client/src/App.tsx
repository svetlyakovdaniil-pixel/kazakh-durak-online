import React from 'react';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a1628',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Казахский Дурак Онлайн
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
          Сайт загружен успешно ✅<br />
          (минимальная версия)
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.6 }}>
          Commit: {Date.now()}
        </p>
      </div>
    </div>
  );
}

export default App;
