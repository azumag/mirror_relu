import { useState } from 'react'
import CameraView from './components/CameraView'
import './App.css'

function App() {
  const [isStarted, setIsStarted] = useState(false)

  return (
    <div className="app">
      <header>
        <h1>Mirror ReLu</h1>
        <p>姿勢矯正アラートシステム - PoC</p>
      </header>

      <main>
        {!isStarted ? (
          <div className="start-screen">
            <h2>Welcome to Mirror ReLu</h2>
            <p>Webカメラを使用して姿勢を検出します</p>
            <button onClick={() => setIsStarted(true)}>
              カメラを起動
            </button>
          </div>
        ) : (
          <CameraView />
        )}
      </main>
    </div>
  )
}

export default App
