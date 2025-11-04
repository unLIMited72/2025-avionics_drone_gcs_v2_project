interface StatusPanelProps {
  isArmed: boolean;
  flightMode: string;
}

export default function StatusPanel({ isArmed, flightMode }: StatusPanelProps) {
  return (
    <div className="bg-slate-900 rounded-xl border border-cyan-500/30 overflow-hidden h-full flex flex-col">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-cyan-500/30">
        <h3 className="text-cyan-400 text-sm font-bold tracking-wider">STATUS</h3>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-slate-300 text-4xl font-bold mb-8">
          {isArmed ? 'ARMED' : 'DISARMED'}
        </div>

        <div className="relative">
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
              isArmed ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: isArmed ? '#ff4444' : '#00ff88',
              boxShadow: isArmed
                ? '0 0 40px rgba(255, 68, 68, 0.6), 0 0 80px rgba(255, 68, 68, 0.3)'
                : '0 0 40px rgba(0, 255, 136, 0.6), 0 0 80px rgba(0, 255, 136, 0.3)',
            }}
          />
        </div>

        <div className="mt-8 bg-slate-800/50 border border-cyan-500/30 rounded-lg px-6 py-3">
          <div className="text-slate-400 text-xs font-bold mb-1 text-center">FLIGHT MODE</div>
          <div className="text-emerald-400 text-lg font-bold text-center">{flightMode}</div>
        </div>
      </div>
    </div>
  );
}
