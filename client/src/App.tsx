import Dashboard from './pages/Dashboard.tsx';
import Landing from './pages/Landing.tsx';
import Privacy from './pages/Privacy.tsx';

// Three pages, plain links between them: no router needed.
function App() {
  switch (window.location.pathname) {
    case '/app':
      return <Dashboard />;
    case '/privacy':
      return <Privacy />;
    default:
      return <Landing />;
  }
}

export default App;
