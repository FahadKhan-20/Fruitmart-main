import { NextResponse } from 'next/server';
import { getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay';

// Read-only gateway status for the checkout page. Keys are set only through
// environment variables (NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);
// there is deliberately no endpoint to change them.
export async function GET() {
  const keyId = getRazorpayKeyId();
  return NextResponse.json({
    configured: isRazorpayConfigured() && Boolean(process.env.RAZORPAY_KEY_SECRET),
    isLiveKey: keyId.startsWith('rzp_live_'),
  });
}
