import { NextRequest, NextResponse } from 'next/server';
import { sendDutySummaryEmails, SendEmailPayload } from '@/lib/sendgrid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SendEmailPayload;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          total: 0,
          sent: 0,
          failed: 0,
          results: [],
          error: 'No recipient items provided to send.',
        },
        { status: 400 }
      );
    }

    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          total: body.items.length,
          sent: 0,
          failed: body.items.length,
          results: [],
          error: 'SendGrid API Key (SENDGRID_API_KEY) is not configured in the server environment (.env.local).',
        },
        { status: 400 }
      );
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          total: body.items.length,
          sent: 0,
          failed: body.items.length,
          results: [],
          error: 'SendGrid Sender Email (SENDGRID_FROM_EMAIL) is not configured in the server environment (.env.local).',
        },
        { status: 400 }
      );
    }

    const summary = await sendDutySummaryEmails(body);

    return NextResponse.json(summary, {
      status: summary.sent > 0 || summary.failed === 0 ? 200 : 500,
    });
  } catch (error: any) {
    console.error('Error in send-duty-summary API:', error);
    return NextResponse.json(
      {
        success: false,
        total: 0,
        sent: 0,
        failed: 0,
        results: [],
        error: error?.message || 'An unexpected error occurred while processing emails.',
      },
      { status: 500 }
    );
  }
}
