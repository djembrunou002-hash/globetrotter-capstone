import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ItineraryDraftProvider from './context/ItineraryDraftProvider.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Destinations from './pages/Destinations.jsx'
import DestinationDetails from './pages/Destinationdetails.jsx'
import Itineraries from './pages/Itineraries.jsx'
import ItineraryDetails from './pages/itineraryDetails.jsx'
import Profile from './pages/Profile.jsx'

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
          <Route path="/destinations/:id" element={<DestinationDetails />} />
          <Route path="/itineraries" element={<Itineraries />} />
          <Route path="/itineraries/:id" element={<ItineraryDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ItineraryDraftProvider>
    </BrowserRouter>
  )
}

export default App