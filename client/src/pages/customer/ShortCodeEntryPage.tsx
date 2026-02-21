import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import Card from '@/components/ui/Card';
import useSession from '@/hooks/useSession';
import { generateFingerprint } from '@/lib/fingerprint';

const VALID_CHARS = /^[23456789A-HJ-NP-Za-hj-np-z]$/;
const CODE_LENGTH = 6;

const ShortCodeEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { joinSessionByCode, isInSession, store } = useSession();

  const [step, setStep] = useState<'code' | 'nickname'>('code');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[\s\-]/g, '');
    const filtered = raw
      .split('')
      .filter((ch) => VALID_CHARS.test(ch))
      .join('')
      .slice(0, CODE_LENGTH);
    setCode(filtered);
    setError(null);
  };

  const displayCode = code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;

  const handleCodeSubmit = () => {
    if (code.length !== CODE_LENGTH) return;
    setStep('nickname');
    setError(null);
  };

  const handleJoin = async () => {
    if (code.length !== CODE_LENGTH) return;

    setLoading(true);
    setError(null);

    try {
      const fingerprint = generateFingerprint();
      await joinSessionByCode(code, nickname.trim(), fingerprint);
      navigate('/menu', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || t('common.something_went_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleRejoin = () => {
    navigate('/menu', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface-light">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {store?.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 mb-4">
              <Icon name="pin" size={32} className="text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-surface-dark">{store?.name || 'AnyTable'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('session.enter_table_code')}
          </p>
        </div>

        <Card padding="lg" className="mb-4">
          {isInSession ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
                <Icon name="check_circle" size={20} className="text-green-600" />
                <p className="text-sm text-green-700">{t('session.already_in_session')}</p>
              </div>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                icon="login"
                onClick={handleRejoin}
              >
                {t('session.rejoin')}
              </Button>
            </div>
          ) : step === 'code' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100">
                  <Icon name="dialpad" size={22} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-dark">
                    {t('session.table_code')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('session.table_code_hint')}
                  </p>
                </div>
              </div>

              {/* Big monospace code input */}
              <div className="relative">
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={displayCode}
                  onChange={handleCodeChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCodeSubmit();
                  }}
                  placeholder="XXX-XXX"
                  className="w-full text-center text-3xl font-mono tracking-[0.3em] py-4 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors bg-white"
                  maxLength={7}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button
                variant="primary"
                fullWidth
                size="lg"
                icon="arrow_forward"
                disabled={code.length !== CODE_LENGTH}
                onClick={handleCodeSubmit}
              >
                {t('session.next')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setStep('code'); setError(null); }}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Icon name="arrow_back" size={20} className="text-gray-600" />
                </button>
                <div>
                  <p className="text-sm font-semibold text-surface-dark">
                    {t('session.table_code')}: {displayCode}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('session.enter_nickname')}
                  </p>
                </div>
              </div>

              <Input
                label={t('session.enter_nickname_optional')}
                placeholder={t('session.nickname_placeholder_optional')}
                icon="person"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin();
                }}
                error={error ?? undefined}
                autoFocus
              />

              <Button
                variant="primary"
                fullWidth
                size="lg"
                icon="login"
                loading={loading}
                onClick={handleJoin}
              >
                {loading ? t('session.joining') : t('session.join_session')}
              </Button>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by AnyTable
        </p>
      </div>
    </div>
  );
};

export default ShortCodeEntryPage;
