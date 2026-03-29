import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Parishioners from '@/pages/Parishioners';
import Events from '@/pages/Events';
import Financial from '@/pages/Financial';
import Families from '@/pages/Families';
import Sacraments from '@/pages/Sacraments';
import Tithers from '@/pages/Tithers';
import TitherDetail from '@/pages/TitherDetail';
import Masses from '@/pages/Masses';
import MassIntentions from '@/pages/MassIntentions';
import MassTemplates from '@/pages/MassTemplates';
import AccountPlans from '@/pages/AccountPlans';
import Spaces from '@/pages/Spaces';
import Pastorals from '@/pages/Pastorals';
import PastoralDetail from '@/pages/PastoralDetail';
import Campaigns from '@/pages/Campaigns';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/paroquianos" element={<Parishioners />} />
                    <Route path="/familias" element={<Families />} />
                    <Route path="/sacramentos" element={<Sacraments />} />
                    <Route path="/dizimistas" element={<Tithers />} />
                    <Route path="/dizimistas/:id" element={<TitherDetail />} />
                    <Route path="/financeiro" element={<Financial />} />
                    <Route path="/missas" element={<Masses />} />
                    <Route path="/intencoes" element={<MassIntentions />} />
                    <Route path="/modelos-missa" element={<MassTemplates />} />
                    <Route path="/eventos" element={<Events />} />
                    <Route path="/pastorais" element={<Pastorals />} />
                    <Route path="/pastorais/:id" element={<PastoralDetail />} />
                    <Route path="/campanhas" element={<Campaigns />} />
                    <Route path="/espacos" element={<Spaces />} />
                    <Route path="/plano-de-contas" element={<AccountPlans />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
      <Analytics />
    </BrowserRouter>
  );
}
