'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminConsoleShell } from '@/components/auth/AdminConsoleShell';

export default function CrmDashboardRoutePage() {
  const { setActiveTab } = useAuth();

  useEffect(() => {
    setActiveTab('crm-dashboard');
  }, [setActiveTab]);

  return <AdminConsoleShell />;
}
