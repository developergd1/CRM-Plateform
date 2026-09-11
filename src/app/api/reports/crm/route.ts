import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateCrmReport, serializeToCsv, CrmReportType } from '@/lib/services/report-service';
import { DateFilterPreset } from '@/lib/services/analytics-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Strict RBAC: Corporate Client Portal accounts cannot view internal CRM reports
    if (user.role === 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden: Client accounts are restricted from accessing internal CRM reports.' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const type = (searchParams.get('type') || 'leads') as CrmReportType;
    const preset = (searchParams.get('preset') || 'THIS_MONTH') as DateFilterPreset;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const format = searchParams.get('format') || 'json';

    const report = await generateCrmReport({
      type,
      preset,
      startDate,
      endDate,
      page,
      limit,
    });

    if (format.toLowerCase() === 'csv') {
      const csvData = serializeToCsv(report.rows);
      const filename = `growth_india_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error in CRM Reports API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate CRM report' },
      { status: 500 }
    );
  }
}
