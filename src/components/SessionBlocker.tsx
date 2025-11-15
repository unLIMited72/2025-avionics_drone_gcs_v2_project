import { useState, useEffect } from 'react';
import { Lock, RefreshCw } from 'lucide-react';

interface SessionBlockerProps {
  onRetry: () => void;
}

export default function SessionBlocker({ onRetry }: SessionBlockerProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRetry();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRetry]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-orange-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              현재 사용자가 존재합니다
            </h1>
            <p className="text-slate-400">
              현재 다른 사용자가 시스템에 접속 중입니다.
            </p>
            <p className="text-sm text-slate-500">
              {countdown}초 후 자동으로 재시도합니다.
            </p>
          </div>

          <button
            onClick={onRetry}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/25"
          >
            <RefreshCw className="w-5 h-5" />
            지금 다시 시도
          </button>

          <div className="pt-4 border-t border-slate-700/50 w-full">
            <p className="text-xs text-slate-500">
              세션은 브라우저를 닫거나 페이지를 나가면 자동으로 해제됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
