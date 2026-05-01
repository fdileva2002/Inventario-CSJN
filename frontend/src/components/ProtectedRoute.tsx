import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken } from '../auth/auth.storage';

type Props = {
  children: ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}