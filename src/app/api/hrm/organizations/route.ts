import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { hrmStore, HrmTenant } from '@/lib/hrmStore';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    
    // Fetch real clients from database
    const dbClients = await prisma.client.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { companyName: 'asc' },
    });

    const clientTenants: HrmTenant[] = dbClients.map((c) => ({
      id: c.id,
      name: c.companyName,
      slug: (c.clientId || c.companyName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      industry: c.industry || 'Client Organization',
      plan: c.subscriptionPlan || 'STANDARD',
      employeeCount: c._count.employees || 0,
      contactEmail: c.email || `contact@${c.clientId?.toLowerCase() || 'client'}.com`,
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      locations: [c.location || c.city || 'Headquarters'],
      holidays: [
        { name: 'Republic Day', date: '2026-01-26' },
        { name: 'Independence Day', date: '2026-08-15' },
      ],
      departments: [
        { id: `dept-${c.id}-1`, name: 'Operations', code: 'OPS', manager: c.contactPerson, employees: c._count.employees || 0 },
        { id: `dept-${c.id}-2`, name: 'Management', code: 'MGMT', manager: c.contactPerson, employees: 1 },
      ],
      designations: [
        { id: `des-${c.id}-1`, title: 'Managing Director', department: 'Management', level: 'Executive' },
        { id: `des-${c.id}-2`, title: 'Operations Specialist', department: 'Operations', level: 'Associate' },
      ],
    }));

    // If client user, return ONLY their own tenant
    if (user?.role === 'CLIENT') {
      const myTenant = clientTenants.find((t) => t.id === user.clientId || t.slug.includes(user.clientId?.toLowerCase() || ''));
      return NextResponse.json({
        success: true,
        tenants: myTenant ? [myTenant] : clientTenants.slice(0, 1),
      });
    }

    // Growth India internal tenant
    const internalTenant = hrmStore.tenants[0] || {
      id: 'ten-growth-india',
      name: 'Growth India Technologies (Internal)',
      slug: 'growth-india',
      industry: 'Enterprise IT & Software Solutions',
      plan: 'ENTERPRISE_PRO',
      employeeCount: 68,
      contactEmail: 'hr@growthindia.in',
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      locations: ['Noida (HQ)', 'Bengaluru Hub', 'Mumbai Office', 'Remote'],
      holidays: [
        { name: 'Republic Day', date: '2026-01-26' },
        { name: 'Independence Day', date: '2026-08-15' },
      ],
      departments: [
        { id: 'dept-eng', name: 'Engineering & DevOps', code: 'ENG', manager: 'Aarav Sharma', employees: 28 },
        { id: 'dept-sales', name: 'Enterprise Sales', code: 'SALES', manager: 'Rahul Verma', employees: 18 },
        { id: 'dept-hr', name: 'Human Resources & Talent', code: 'HR', manager: 'Neha Gupta', employees: 8 },
        { id: 'dept-ops', name: 'Client Success & Ops', code: 'OPS', manager: 'Priya Patel', employees: 14 },
      ],
      designations: [
        { id: 'des-1', title: 'VP of Technology', department: 'Engineering & DevOps', level: 'Executive' },
      ],
    };

    // Combine internal tenant + all real client tenants
    const combined = [internalTenant, ...clientTenants];

    return NextResponse.json({
      success: true,
      tenants: combined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.industry) {
      return NextResponse.json({ error: 'Name and Industry are required' }, { status: 400 });
    }

    const newTenant = {
      id: `ten-${Date.now()}`,
      name: body.name,
      slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      industry: body.industry,
      plan: body.plan || 'ENTERPRISE_PRO',
      employeeCount: 1,
      contactEmail: body.contactEmail || `admin@${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      locations: body.location ? [body.location] : ['Headquarters'],
      holidays: [
        { name: 'Republic Day', date: '2026-01-26' },
        { name: 'Independence Day', date: '2026-08-15' },
      ],
      departments: [
        { id: `dept-${Date.now()}-1`, name: 'Operations', code: 'OPS', manager: 'Admin', employees: 1 },
      ],
      designations: [
        { id: `des-${Date.now()}-1`, title: 'Managing Director', department: 'Operations', level: 'Executive' },
      ],
    };

    hrmStore.tenants.push(newTenant);

    return NextResponse.json({
      success: true,
      tenant: newTenant,
      message: 'New organization created successfully with tenant isolation',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
