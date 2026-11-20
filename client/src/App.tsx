import { usePath } from './lib/navigation.ts';
import Dashboard from './pages/Dashboard.tsx';
import Landing from './pages/Landing.tsx';
import Privacy from './pages/Privacy.tsx';

// Plain paths, no router: /app and every /app/… page share the app.
function App() {
  const path = usePath();
  if (path === '/privacy') return <Privacy />;
  if (path === '/app' || path.startsWith('/app/')) return <Dashboard />;
  return <Landing />;
}

export default App;
