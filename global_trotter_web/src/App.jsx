import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ItineraryDraftProvider from './context/ItineraryDraftProvider.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import SelectStyle from './pages/SelectStyle.jsx'
import Home from './pages/Home.jsx'
import Destinations from './pages/Destinations.jsx'
import DestinationDetails from './pages/Destinationdetails.jsx'
import Itineraries from './pages/Itineraries.jsx'
import ItineraryDetails from './pages/itineraryDetails.jsx'
import MapPage from './pages/MapPage.jsx'
import Profile from './pages/Profile.jsx'
import Favorites from './pages/Favorites.jsx'
import MyDestinations from './pages/MyDestinations.jsx'
import DestinationForm from './pages/DestinationForm.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <ItineraryDraftProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/select-style" element={<SelectStyle />} />
          <Route path="/home" element={<Home />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/destinations/:id" element={<DestinationDetails />} />
          <Route path="/itineraries" element={<Itineraries />} />
          <Route path="/itineraries/:id" element={<ItineraryDetails />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/my-destinations" element={<MyDestinations />} />
          <Route path="/my-destinations/new" element={<DestinationForm mode="create" />} />
          <Route path="/my-destinations/:id/edit" element={<DestinationForm mode="edit" />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/destinations/:id/edit" element={<DestinationForm mode="admin-edit" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ItineraryDraftProvider>
    </BrowserRouter>
  )
}

export default App