import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ItineraryDraftProvider from './context/ItineraryDraftProvider.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Destinations from './pages/Destinations.jsx'
import Itineraries from './pages/Itineraries.jsx'
import ItineraryDetails from './pages/ItineraryDetails.jsx'

function App() {
  return (
    <BrowserRouter>
      <ItineraryDraftProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/itineraries" element={<Itineraries />} />
          <Route path="/itineraries/:id" element={<ItineraryDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ItineraryDraftProvider>
    </BrowserRouter>
  )
}

export default App