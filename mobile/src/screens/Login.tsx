import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

const digitsOf = (v: string) => v.replace(/\D/g, '');

export default function Login() {
  const { d } = useStore();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');
  const [wait, setWait] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const valid = digitsOf(phone).length === 10;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendOtp = () => {
    if (!valid) return;
    setStep('otp');
    setOtp('');
    setWait(30);
    setTimeout(() => otpRef.current?.focus(), 250);
  };
  const verify = () => { if (otp.length === 4) d({ type: 'login', phone: digitsOf(phone) }); };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '46%', overflow: 'hidden' }}>
        <img src="images/hero.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(63,82,50,0.15) 0%,rgba(63,82,50,0.55) 100%)' }} />
        <div style={{ position: 'absolute', left: 24, bottom: 56, display: 'flex', flexDirection: 'column', gap: 8, color: '#fff' }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em' }}>MD FRESH</span>
          <span className="display" style={{ fontSize: 34, lineHeight: 1.05 }}>Farm fresh,<br />in 25 minutes.</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 'calc(46% - 30px)', background: 'var(--cream)', borderRadius: '30px 30px 0 0', padding: '28px 22px calc(40px + var(--sb))', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {step === 'phone' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Log in or sign up</span>
              <span className="muted" style={{ fontSize: 14 }}>We’ll send a 4-digit code to your number.</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 16px', borderRadius: 16, background: 'var(--paper)', border: '1px solid #D6D0C2' }}>
              <span style={{ fontSize: 16, fontWeight: 600, paddingRight: 10, borderRight: '1px solid #E1DBCD' }}>+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))}
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                inputMode="tel" autoComplete="tel-national" placeholder="Mobile number"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: 16, color: 'var(--ink)' }}
              />
            </label>
            <button className="btn" disabled={!valid} onClick={sendOtp}>Get code</button>
            <span style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.5 }}>By continuing you agree to our Terms and Privacy Policy.</span>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Enter code</span>
              <span className="muted" style={{ fontSize: 14 }}>
                Sent to +91 {phone} · <button onClick={() => setStep('phone')} style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>Edit</button>
              </span>
            </div>
            {/* The four boxes mirror one hidden-in-plain-sight input, so paste and SMS autofill work */}
            <div onClick={() => otpRef.current?.focus()} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ height: 62, borderRadius: 16, background: 'var(--paper)', border: `1.5px solid ${i === otp.length ? 'var(--green)' : '#D6D0C2'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>
                  {otp[i] || ''}
                </div>
              ))}
            </div>
            <input
              ref={otpRef}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="Type the 4-digit code"
              style={{ height: 44, border: 'none', borderBottom: '1px solid #D6D0C2', background: 'transparent', font: 'inherit', fontSize: 15, outline: 'none', color: 'var(--ink)', textAlign: 'center' }}
            />
            <button className="btn" disabled={otp.length !== 4} onClick={verify}>Verify</button>
            <span className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
              {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, '0')}` : <button onClick={() => { setOtp(''); setWait(30); }} style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>Resend code</button>}
            </span>
            <span style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center' }}>Demo build: no SMS is sent. Any 4-digit code works.</span>
          </>
        )}
      </div>
    </div>
  );
}
