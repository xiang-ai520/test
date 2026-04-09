import { Navigate, Route, Routes } from 'react-router-dom'
import { JoinPage } from './pages/JoinPage.jsx'
import { RoomPage } from './pages/RoomPage.jsx'
import { HostLivePage } from './pages/HostLivePage.jsx'
import { AudienceLivePage } from './pages/AudienceLivePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/live/host/:roomId" element={<HostLivePage />} />
      <Route path="/live/audience/:roomId" element={<AudienceLivePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
