'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminConsoleShell } from '@/components/auth/AdminConsoleShell';

export default function LeadsPage() {
  const { setActiveTab } = useAuth();

  useEffect(() => {
    setActiveTab('crm-leads');
  }, [setActiveTab]);

  return <AdminConsoleShell />;
}
