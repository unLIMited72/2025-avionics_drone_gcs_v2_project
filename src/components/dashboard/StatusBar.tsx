interface StatusBarProps {
  isArmed: boolean;
}

export default function StatusBar({ isArmed }: StatusBarProps) {
  return (
    <div
      className={`px-4 py-3 border-t ${
        isArmed
          ? 'bg-red-900/30 border-red-700'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              isArmed ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          ></div>
          <span
            className={`text-sm font-semibold ${
              isArmed ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isArmed ? 'ARMED' : 'DISARMED'}
          </span>
        </div>

        <div className="text-slate-400 text-xs">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
