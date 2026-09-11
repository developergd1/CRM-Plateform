'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminConsoleShell } from '@/components/auth/AdminConsoleShell';

export default function FollowUpsPage() {
  const { setActiveTab } = useAuth();

  useEffect(() => {
    setActiveTab('crm-followups');
  }, [setActiveTab]);

  return <AdminConsoleShell />;
}
