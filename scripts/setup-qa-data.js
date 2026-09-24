const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupQAData() {
  console.log('🔧 Setting up isolated QA Test Environment & Roles...');

  // 1. Ensure Roles
  const rolesToEnsure = [
    { name: 'SUPER_ADMIN', displayName: 'Super Administrator' },
    { name: 'ADMIN', displayName: 'Platform Administrator' },
    { name: 'ADMIN_HR', displayName: 'HR Lead' },
    { name: 'MANAGER_TL', displayName: 'Team Manager' },
    { name: 'EMPLOYEE', displayName: 'Employee' },
  ];

  const roleMap = {};
  for (const r of rolesToEnsure) {
    let role = await prisma.role.findFirst({ where: { name: r.name } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: r.name,
          displayName: r.displayName,
          isSystem: true,
        },
      });
      console.log(`   + Created missing role: ${r.name}`);
    }
    roleMap[r.name] = role.id;
  }

  // 2. Ensure QA Departments
  const depts = [
    { code: 'QA-ENG', name: 'QA Engineering' },
    { code: 'QA-HR', name: 'QA Human Resources' },
    { code: 'QA-SALES', name: 'QA Sales' },
    { code: 'QA-CS', name: 'QA Client Success' },
  ];

  const deptMap = {};
  for (const d of depts) {
    let dept = await prisma.department.findFirst({ where: { code: d.code } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { code: d.code, name: d.name, description: 'Isolated QA Department' },
      });
      console.log(`   + Created QA department: ${d.name}`);
    }
    deptMap[d.code] = dept.id;
  }

  // 3. Create/Update QA Personas
  const defaultPasswordHash = await bcrypt.hash('QaPass#2026', 10);

  const personas = [
    {
      email: 'qa.platformadmin@growthindia.test',
      fullName: 'QA Platform Administrator',
      role: 'SUPER_ADMIN',
      phone: '9900000001',
      empId: 'QA-ADMIN-001',
      deptId: deptMap['QA-ENG'],
      designation: 'Platform Director',
    },
    {
      email: 'qa.hrlead@growthindia.test',
      fullName: 'QA HR Lead',
      role: 'ADMIN_HR',
      phone: '9900000002',
      empId: 'QA-HR-001',
      deptId: deptMap['QA-HR'],
      designation: 'Lead Human Capital',
    },
    {
      email: 'qa.manager@growthindia.test',
      fullName: 'QA Team Manager',
      role: 'MANAGER_TL',
      phone: '9900000003',
      empId: 'QA-MGR-001',
      deptId: deptMap['QA-ENG'],
      designation: 'Engineering Manager',
    },
    {
      email: 'qa.emp1@growthindia.test',
      fullName: 'QA Employee One',
      role: 'EMPLOYEE',
      phone: '9900000004',
      empId: 'QA-EMP-001',
      deptId: deptMap['QA-ENG'],
      designation: 'Software Engineer',
    },
    {
      email: 'qa.emp2@growthindia.test',
      fullName: 'QA Employee Two',
      role: 'EMPLOYEE',
      phone: '9900000005',
      empId: 'QA-EMP-002',
      deptId: deptMap['QA-SALES'],
      designation: 'Sales Specialist',
    },
  ];

  for (const p of personas) {
    let user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: p.email,
          passwordHash: defaultPasswordHash,
          roleId: roleMap[p.role],
          isActive: true,
        },
      });
      console.log(`   + Created user: ${p.email} (${p.role})`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: roleMap[p.role], isActive: true },
      });
    }

    let emp = await prisma.employee.findUnique({ where: { employeeId: p.empId } });
    if (!emp) {
      // Check phone conflict
      const phoneConflict = await prisma.employee.findUnique({ where: { phone: p.phone } });
      if (!phoneConflict) {
        emp = await prisma.employee.create({
          data: {
            employeeId: p.empId,
            userId: user.id,
            fullName: p.fullName,
            phone: p.phone,
            departmentId: p.deptId,
            designation: p.designation,
            employmentType: 'Full-Time',
            status: 'ACTIVE',
          },
        });
        console.log(`   + Created EMS employee record: ${p.empId} (${p.fullName})`);
      }
    }
  }

  // Link manager hierarchy: QA-MGR-001 manages QA-EMP-001
  const mgrEmp = await prisma.employee.findUnique({ where: { employeeId: 'QA-MGR-001' } });
  const subEmp = await prisma.employee.findUnique({ where: { employeeId: 'QA-EMP-001' } });
  if (mgrEmp && subEmp) {
    await prisma.employee.update({
      where: { id: subEmp.id },
      data: { reportingManagerId: mgrEmp.id },
    });
    console.log('   + Linked QA-EMP-001 reporting manager to QA-MGR-001');
  }

  console.log('✅ QA Test Personas and Hierarchy Successfully Established!');
}

setupQAData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
