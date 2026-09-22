import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';

import Home from './pages/Home';
import Learn from './pages/Learn';
import Lesson from './pages/Lesson';
import Builder from './pages/Builder';
import HardwareAdvisor from './pages/HardwareAdvisor';
import BrainChoice from './pages/BrainChoice';
import Resources from './pages/Resources';
import Dashboard from './pages/Dashboard';
import KnowledgeManager from './pages/KnowledgeManager';


export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:id" element={<Lesson />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/knowledge" element={<KnowledgeManager />} />
            <Route path="/device" element={<HardwareAdvisor />} />
            <Route path="/brain" element={<BrainChoice />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Home />} />
          </Routes>

        </Layout>
      </HashRouter>
    </AppProvider>
  );
}