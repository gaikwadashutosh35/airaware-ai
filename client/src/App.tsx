import Dashboard from './pages/Dashboard.tsx';
import Landing from './pages/Landing.tsx';

// Two pages, plain links between them: no router needed.
function App() {
  return window.location.pathname === '/app' ? <Dashboard /> : <Landing />;
}

export default App;
