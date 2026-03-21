import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Databases from "./pages/Databases";
import Backups from "./pages/Backups";
import Diagnostics from "./pages/Diagnostics";
import Settings from "./pages/Settings";
import "./App.css";

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/databases" element={<Databases />} />
          <Route path="/backups" element={<Backups />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
