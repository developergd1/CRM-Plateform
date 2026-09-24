import { redirect } from 'next/navigation';

export default function CrmSettingsPage() {
  // In Growth India architecture, CRM navigation renders dynamically through the single-page platform shell at /crm
  redirect('/crm');
}
