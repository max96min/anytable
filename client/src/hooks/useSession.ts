import { useContext } from 'react';
import { SessionContext, type SessionContextValue } from '@/context/SessionContext';

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default useSession;
