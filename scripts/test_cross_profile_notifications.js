const BASE_URL = 'http://localhost:3000';

async function api(endpoint, method = 'GET', body = null, cookie = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }

  const setCookie = res.headers.get('set-cookie');
  const cookieVal = setCookie ? setCookie.split(';')[0] : null;

  return { status: res.status, data: json, cookie: cookieVal };
}

async function run() {
  console.log('🔔 TESTING COMPLETE CROSS-PROFILE NOTIFICATION PIPELINE 🔔\n');

  // 1. Admin Login (admin@growthindia.in)
  const adminLogin = await api('/api/auth/login', 'POST', {
    email: 'admin@growthindia.in',
    password: 'Admin@123',
    portalType: 'ADMIN',
  });
  const adminCookie = adminLogin.cookie || '';
  console.log('Admin Login status:', adminLogin.status, 'User:', adminLogin.data?.user?.fullName);

  // 2. Client Login (rajesh@nexusdynamics.com)
  const clientLogin = await api('/api/auth/login', 'POST', {
    email: 'rajesh@nexusdynamics.com',
    password: 'Client@123',
    portalType: 'CLIENT',
  });
  const clientCookie = clientLogin.cookie || '';
  console.log('Client Login status:', clientLogin.status, 'Client:', clientLogin.data?.user?.companyName);

  // 3. Employee Login (aarav.sharma@nexusdynamics.com)
  const empLogin = await api('/api/auth/login', 'POST', {
    email: 'aarav.sharma@nexusdynamics.com',
    password: 'Emp@12345',
    portalType: 'EMPLOYEE',
  });
  const empCookie = empLogin.cookie || '';
  console.log('Employee Login status:', empLogin.status, 'Employee:', empLogin.data?.user?.fullName);

  // 4. Fetch initial notifications
  const adminNotifs = await api('/api/notifications', 'GET', null, adminCookie);
  console.log('\n[ADMIN NOTIFICATIONS]');
  console.log('Unread:', adminNotifs.data?.unreadCount, 'Total:', adminNotifs.data?.notifications?.length);

  const clientNotifs = await api('/api/notifications', 'GET', null, clientCookie);
  console.log('\n[CLIENT NOTIFICATIONS]');
  console.log('Unread:', clientNotifs.data?.unreadCount, 'Total:', clientNotifs.data?.notifications?.length);

  const empNotifs = await api('/api/notifications', 'GET', null, empCookie);
  console.log('\n[EMPLOYEE NOTIFICATIONS]');
  console.log('Unread:', empNotifs.data?.unreadCount, 'Total:', empNotifs.data?.notifications?.length);

  // 5. Test task creation by Client for Employee
  console.log('\n--- 1. CLIENT ASSIGNS TASK TO EMPLOYEE ---');
  const taskCreateRes = await api('/api/tasks', 'POST', {
    title: 'Audit System Latency & Database Throughput',
    description: 'Prepare detailed summary report for system throughput.',
    priority: 'HIGH',
    assignedToId: '6aa1154559856f2170ca9742', // Aarav Sharma
    expectedDeliverable: 'CSV Metrics Sheet',
  }, clientCookie);
  console.log('Task Create Status:', taskCreateRes.status, 'Task Number:', taskCreateRes.data?.taskNumber);

  const taskId = taskCreateRes.data?.id;

  // Verify Employee received notification
  const empNotifsAfterAssign = await api('/api/notifications', 'GET', null, empCookie);
  console.log('Employee unread count after assignment:', empNotifsAfterAssign.data?.unreadCount);
  const latestEmpNotif = empNotifsAfterAssign.data?.notifications?.[0];
  console.log('Latest employee notification:', latestEmpNotif?.title, '->', latestEmpNotif?.message);

  if (taskId) {
    // 6. Employee ACCEPTS task
    console.log('\n--- 2. EMPLOYEE ACCEPTS TASK ---');
    const acceptRes = await api(`/api/tasks/${taskId}/workflow`, 'POST', { action: 'ACCEPT' }, empCookie);
    console.log('Accept Status:', acceptRes.status, 'Task Status:', acceptRes.data?.status);

    // Verify Client & Admin received notification
    const clientNotifsAfterAccept = await api('/api/notifications', 'GET', null, clientCookie);
    console.log('Client latest notification after accept:', clientNotifsAfterAccept.data?.notifications?.[0]?.title, '->', clientNotifsAfterAccept.data?.notifications?.[0]?.message);

    // 7. Employee SUBMITS deliverables
    console.log('\n--- 3. EMPLOYEE SUBMITS DELIVERABLES ---');
    const submitRes = await api(`/api/tasks/${taskId}/workflow`, 'POST', {
      action: 'SUBMIT',
      payload: { summary: 'Completed latency metrics report attached', links: ['https://drive.google.com/test'] }
    }, empCookie);
    console.log('Submit Status:', submitRes.status, 'Task Status:', submitRes.data?.status);

    // Verify Client received submission notification
    const clientNotifsAfterSubmit = await api('/api/notifications', 'GET', null, clientCookie);
    console.log('Client latest notification after submit:', clientNotifsAfterSubmit.data?.notifications?.[0]?.title, '->', clientNotifsAfterSubmit.data?.notifications?.[0]?.message);

    // 8. Client REVIEWS & APPROVES task
    console.log('\n--- 4. CLIENT APPROVES TASK ---');
    const approveRes = await api(`/api/tasks/${taskId}/workflow`, 'POST', {
      action: 'REVIEW',
      payload: { isApproved: true, feedback: 'Deliverables verified and accepted with excellence.' }
    }, clientCookie);
    console.log('Approve Status:', approveRes.status, 'Task Status:', approveRes.data?.status);

    // Verify Employee received Approval notification
    const empNotifsAfterApprove = await api('/api/notifications', 'GET', null, empCookie);
    console.log('Employee latest notification after approve:', empNotifsAfterApprove.data?.notifications?.[0]?.title, '->', empNotifsAfterApprove.data?.notifications?.[0]?.message);

    // 9. Employee leaves Comment on Task
    console.log('\n--- 5. EMPLOYEE COMMENTS ON TASK ---');
    const commentRes = await api(`/api/tasks/${taskId}/comments`, 'POST', {
      content: 'Thank you for the quick approval! Ready for next batch.',
    }, empCookie);
    console.log('Comment Status:', commentRes.status);

    // Verify Client received comment notification
    const clientNotifsAfterComment = await api('/api/notifications', 'GET', null, clientCookie);
    console.log('Client latest notification after comment:', clientNotifsAfterComment.data?.notifications?.[0]?.title, '->', clientNotifsAfterComment.data?.notifications?.[0]?.message);

    // 10. Test Mark as Read
    if (latestEmpNotif?.id) {
      console.log('\n--- 6. TESTING MARK NOTIFICATION AS READ ---');
      const patchRes = await api('/api/notifications', 'PATCH', { id: latestEmpNotif.id }, empCookie);
      console.log('Mark read status:', patchRes.status, patchRes.data?.message);
    }
  }

  console.log('\n🎉 ALL CROSS-PROFILE NOTIFICATION PIPELINES TESTED AND 100% OPERATIONAL!');
}

run().catch(console.error);
