import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getRazorpayKeyId, getRazorpayKeySecret, isRazorpayConfigured } from '@/lib/razorpay';

export async function GET() {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();
  const configured = isRazorpayConfigured();
  
  const maskedKey = keyId && keyId.length > 8 
    ? `${keyId.substring(0, 8)}...${keyId.substring(keyId.length - 4)}` 
    : (keyId || 'Not set');

  return NextResponse.json({
    configured,
    keyId: keyId || '',
    maskedKey,
    hasSecret: Boolean(secret && !secret.includes('demo')),
    isTestKey: (keyId || '').startsWith('rzp_test_'),
    isLiveKey: (keyId || '').startsWith('rzp_live_'),
  });
}

export async function POST(req: Request) {
  try {
    const { keyId, keySecret } = await req.json();

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json({ error: 'Valid Razorpay Key ID is required (e.g. rzp_test_... or rzp_live_...)' }, { status: 400 });
    }

    const trimmedKey = keyId.trim();
    const trimmedSecret = (keySecret || '').trim();

    // Verify keys against Razorpay API
    let isValid = false;
    let verificationMessage = '';

    if (trimmedSecret) {
      try {
        const auth = Buffer.from(`${trimmedKey}:${trimmedSecret}`).toString('base64');
        const testRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100, // 1 INR in paise for validation
            currency: 'INR',
            receipt: 'key_verify_test',
          }),
        });

        const testData = await testRes.json();
        if (testRes.ok && testData.id) {
          isValid = true;
          verificationMessage = 'Successfully verified with Razorpay live API!';
        } else {
          verificationMessage = testData?.error?.description || 'Razorpay authentication failed. Please verify Key ID and Key Secret.';
        }
      } catch (err: any) {
        verificationMessage = `Verification network note: ${err.message}`;
      }
    }

    // Update in-memory process environment safely without triggering Webpack DefinePlugin replacement
    const envObj = process.env;
    const pubKeyName = 'NEXT_PUBLIC_RAZORPAY_KEY_ID';
    const secKeyName = 'RAZORPAY_KEY_SECRET';
    envObj[pubKeyName] = trimmedKey;
    if (trimmedSecret) {
      envObj[secKeyName] = trimmedSecret;
    }

    // Update .env.local file
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (envContent.includes('NEXT_PUBLIC_RAZORPAY_KEY_ID=')) {
        envContent = envContent.replace(/NEXT_PUBLIC_RAZORPAY_KEY_ID=.*/g, `NEXT_PUBLIC_RAZORPAY_KEY_ID=${trimmedKey}`);
      } else {
        envContent += `\nNEXT_PUBLIC_RAZORPAY_KEY_ID=${trimmedKey}`;
      }

      if (trimmedSecret) {
        if (envContent.includes('RAZORPAY_KEY_SECRET=')) {
          envContent = envContent.replace(/RAZORPAY_KEY_SECRET=.*/g, `RAZORPAY_KEY_SECRET=${trimmedSecret}`);
        } else {
          envContent += `\nRAZORPAY_KEY_SECRET=${trimmedSecret}`;
        }
      }

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    } catch (fsErr) {
      console.warn('Could not write to .env.local:', fsErr);
    }

    return NextResponse.json({
      success: true,
      isValid,
      verificationMessage,
      keyId: trimmedKey,
      isTestKey: trimmedKey.startsWith('rzp_test_'),
      isLiveKey: trimmedKey.startsWith('rzp_live_'),
    });
  } catch (error: any) {
    console.error('Error saving Razorpay keys:', error);
    return NextResponse.json({ error: error.message || 'Failed to update keys' }, { status: 500 });
  }
}
