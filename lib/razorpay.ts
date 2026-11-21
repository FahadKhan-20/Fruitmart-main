import Razorpay from 'razorpay';

export const getRazorpayKeyId = (): string => {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_51OtQ1GSB7u4i9';
};

export const getRazorpayKeySecret = (): string => {
  return process.env.RAZORPAY_KEY_SECRET || 'sk_test_demo_secret_key';
};

export const isRazorpayConfigured = (): boolean => {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();
  return Boolean(
    keyId &&
    secret &&
    !keyId.includes('dummy') &&
    keyId.startsWith('rzp_')
  );
};

export const getRazorpayInstance = (): Razorpay => {
  return new Razorpay({
    key_id: getRazorpayKeyId(),
    key_secret: getRazorpayKeySecret(),
  });
};

// Export instance for backward compatibility
export const razorpay = getRazorpayInstance();
