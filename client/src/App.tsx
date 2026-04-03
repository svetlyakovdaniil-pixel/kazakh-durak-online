import React from 'react';
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a1628',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Казахский Дурак Онлайн
        </h1>
        <p style={{ fontSize: '1.3rem', marginBottom: '2rem', opacity: 0.9 }}>
          Сайт успешно загружен на Vercel
        </p>
        <p style={{ opacity: 0.6 }}>
          Это минимальная версия. Сейчас мы будем постепенно добавлять игру.
        </p>
      </div>
    </div>
  );
}

export default App;
