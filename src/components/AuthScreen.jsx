import React, { useState } from 'react';
import { Zap, Mail, KeyRound, Gift, ArrowRight, Loader2, Check } from 'lucide-react';
import { supabase } from '../utils/supabase';

/**
 * Auth screen with email OTP login.
 * Currently mock — will connect to Supabase later.
 */
export default function AuthScreen({ onLocalLogin }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'promo'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoResult, setPromoResult] = useState(null);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Помилка: Supabase не підключено');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) {
      setError('Введіть коректний код');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });

    setLoading(false);

    if (verifyError) {
      setError('Невірний код. Спробуйте ще раз.');
    } else {
      setStep('promo');
    }
  };

  const handlePromoCheck = async () => {
    if (!promoCode.trim()) return;

    setLoading(true);
    setPromoResult(null);

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .single();

      if (error || !data) {
        setPromoResult({ valid: false, message: 'Промокод не знайдено' });
      } else {
        setPromoResult({ valid: true, message: data.is_free ? '🎉 Промокод активовано! Безкоштовний доступ.' : `🎉 Знижка ${data.discount_percent}% активована!` });
        // В реальному житті тут потрібно зберегти в user_promos
      }
    } catch (err) {
      setPromoResult({ valid: false, message: 'Помилка перевірки' });
    }
    setLoading(false);
  };

  const handleFinish = () => {
    // For now, fall back to local profile system
    if (onLocalLogin) onLocalLogin(email);
  };

  return (
    <div className="auth-backdrop">
      <div className="auth-container animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'var(--gradient-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-md)',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.35)',
          }}>
            <Zap size={36} color="white" />
          </div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 900, color: 'var(--text-primary)' }}>
            Quest Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 'var(--font-sm)' }}>
            Геймифікований трекер задач
          </p>
        </div>

        {/* Step: Email */}
        {step === 'email' && (
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)', textAlign: 'center' }}>Вхід в акаунт</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              Введіть email — ми надішлемо код підтвердження
            </p>

            <form onSubmit={handleSendOTP}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    style={{ paddingLeft: 44 }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: 'var(--color-danger-light)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
                {loading ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
                {loading ? 'Надсилаємо...' : 'Отримати код'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleFinish}
                style={{ fontSize: 'var(--font-xs)' }}
              >
                Увійти без акаунту (локальний режим)
              </button>
            </div>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-sm)', textAlign: 'center' }}>Код підтвердження</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              Ми надіслали код на <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
            </p>

            <form onSubmit={handleVerifyOTP}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    className="form-input"
                    type="text"
                    maxLength={8}
                    placeholder="00000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.trim().slice(0, 8))}
                    autoFocus
                    style={{
                      paddingLeft: 44,
                      fontSize: 'var(--font-2xl)',
                      fontWeight: 800,
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: 'var(--color-danger-light)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading || otp.length < 6}>
                {loading ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
                {loading ? 'Перевіряємо...' : 'Підтвердити'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep('email')}>
                  ← Змінити email
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step: Promo Code */}
        {step === 'promo' && (
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-md)',
              }}>
                <Check size={28} color="var(--color-success-light)" />
              </div>
              <h3>Вхід успішний!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
                {email}
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">
                <Gift size={14} style={{ marginRight: 4 }} />
                Промокод (необов'язково)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Введіть промокод..."
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePromoCheck}
                  disabled={loading || !promoCode.trim()}
                >
                  {loading ? <Loader2 size={16} className="spin" /> : 'Перевірити'}
                </button>
              </div>
              {promoResult && (
                <div style={{
                  marginTop: 8,
                  fontSize: 'var(--font-sm)',
                  color: promoResult.valid ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                }}>
                  {promoResult.message}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              onClick={handleFinish}
            >
              <ArrowRight size={18} /> Продовжити
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
