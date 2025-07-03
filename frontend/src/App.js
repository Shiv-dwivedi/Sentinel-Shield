import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import BreachResults from "./components/Breach";
import WebsiteSafetyCheck from "./components/webrisk";
import BreachResult from "./components/Breachex";
import Scam from "./components/scam";
import BreachHistory from "./components/history";
import TempMail from "./components/email";
import LoginPage from "./components/Login";
import ScamDetection from "./components/scaminput";
import Help from "./components/Help";
import Popemail from "./components/Popemail";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
<Route path="/breach-results" element={<BreachResults />} />
<Route path="/breach-result" element={<BreachResult />} />
<Route path="/website-results" element={<WebsiteSafetyCheck />} />
      <Route path="/scam-results" element={<Scam/>}/>
      <Route path="/updates" element={<BreachHistory/>}/>
      <Route path="/email" element={<TempMail/>}/>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/scam" element={<ScamDetection/>}/>
      <Route path="/help" element={<Help/>}/>
      <Route path="/popemail" element={<Popemail/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </Router>
  );
}

export default App;
