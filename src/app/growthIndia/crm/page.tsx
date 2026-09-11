'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminConsoleShell } from '@/components/auth/AdminConsoleShell';

export default function CrmIndexPage() {
  const { setActiveTab } = useAuth();

  useEffect(() => {
    setActiveTab('crm-dashboard');
  }, [setActiveTab]);

  return <AdminConsoleShell />;
}
