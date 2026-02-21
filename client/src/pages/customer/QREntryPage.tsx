import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import Card from '@/components/ui/Card';
import useSession from '@/hooks/useSession';

function generateFingerprint(): string {
  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const QREntryPage: React.FC = () => {
  const { qrToken } = useParams<{ qrToken: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { joinSession, isInSession } = useSession();

  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!qrToken || !nickname.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const fingerprint = generateFingerprint();
      await joinSession(qrToken, nickname.trim(), fingerprint);
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 mb-4">
            <Icon name="restaurant" size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-dark">AnyTable</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('session.scan_qr')}
          </p>
        </div>

        <Card padding="lg" className="mb-4">
          {/* Table indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100">
              <Icon name="table_restaurant" size={22} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('session.welcome')}</p>
              <p className="text-sm font-semibold text-surface-dark">
                {qrToken ? qrToken.split('-').slice(0, 2).join(' ') : 'Restaurant'}
              </p>
            </div>
          </div>

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
          ) : (
            <div className="space-y-4">
              <Input
                label={t('session.enter_nickname')}
                placeholder={t('session.nickname_placeholder')}
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
                disabled={!nickname.trim() || !qrToken}
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

export default QREntryPage;
