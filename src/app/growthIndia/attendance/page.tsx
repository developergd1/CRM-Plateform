'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminConsoleShell } from '@/components/auth/AdminConsoleShell';

export default function AdminAttendancePage() {
  const { setActiveTab } = useAuth();

  useEffect(() => {
    setActiveTab('attendance');
  }, [setActiveTab]);

  return <AdminConsoleShell />;
}
