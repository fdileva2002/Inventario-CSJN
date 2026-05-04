import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import DevicesPage from '../pages/DevicesPage';
import ProtectedRoute from '../components/ProtectedRoute';
import ConsumablesPage from '../pages/ConsumablesPage';
import PeoplePage from '../pages/PeoplePage';
import PurchaseOrdersPage from '../pages/PurchaseOrdersPage';
import SuppliersPage from '../pages/SuppliersPage';
import DeviceCategoriesPage from '../pages/DeviceCategoriesPage';
import UsersPage from '../pages/UsersPage';
import DepartmentsPage from '../pages/DepartmentsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <DevicesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <PeoplePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/device-categories"
          element={
            <ProtectedRoute>
              <DeviceCategoriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/departments"
          element={
            <ProtectedRoute>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/consumables"
          element={
            <ProtectedRoute>
              <ConsumablesPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      
      

      
    </BrowserRouter>
  );
}