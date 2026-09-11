'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminConsoleShell } from '@/components/auth/AdminConsoleShell';

export default function DealsPage() {
  const { setActiveTab } = useAuth();

  useEffect(() => {
    setActiveTab('crm-deals');
  }, [setActiveTab]);

  return <AdminConsoleShell />;
}
