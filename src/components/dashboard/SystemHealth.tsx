interface SystemHealthProps {
  battery: number;
  voltage?: number;
  current?: number;
}

export default function SystemHealth({ battery, voltage = 22.4, current = 12.3 }: SystemHealthProps) {
  const getBatteryColor = (level: number) => {
    if (level > 50) return '#00ff88';
    if (level > 20) return '#ffaa00';
    return '#ff4444';
  };

  const statusItems = [
    { label: 'HEARTBEAT', value: 'Disconnected', color: '#ff4444' },
    { label: 'FAILSAFE', value: 'Normal', color: '#00ff88' },
    { label: 'EKF ESTIMATION', value: 'Invalid', color: '#ff4444' },
    { label: 'GPS STATUS', value: 'No Fix', sublabel: '0 sats', color: '#ff4444' },
    { label: 'HOME POSITION', value: 'Not Set', color: '#ff4444' },
    { label: 'IMU SENSOR', value: 'No Data', color: '#ff4444' },
    { label: 'BAROMETER', value: 'Error', color: '#ff4444' },
  ];

  return (
    <div className="bg-slate-900 rounded-xl border border-cyan-500/30 overflow-hidden">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-cyan-500/30">
        <h3 className="text-cyan-400 text-sm font-bold tracking-wider">SYSTEM HEALTH</h3>
      </div>

      <div className="p-4 space-y-2">
        {statusItems.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 text-xs font-medium">{item.label}</span>
            </div>
            <div className="flex flex-col items-end">
              <span
                className="text-xs font-bold"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
              {item.sublabel && (
                <span className="text-[10px] text-slate-500">{item.sublabel}</span>
              )}
            </div>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-slate-400 text-xs font-bold mb-2">BATTERY</div>

          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-8 bg-slate-800 rounded border border-slate-600 overflow-hidden flex">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 ${i < Math.floor(battery / 10) ? '' : 'opacity-20'}`}
                  style={{
                    backgroundColor: i < Math.floor(battery / 10) ? getBatteryColor(battery) : '#334155'
                  }}
                />
              ))}
            </div>
            <span
              className="text-2xl font-bold font-mono"
              style={{ color: getBatteryColor(battery) }}
            >
              {battery}%
            </span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{voltage.toFixed(1)}V</span>
            <span className="text-slate-400">{current.toFixed(1)}A</span>
          </div>
        </div>
      </div>
    </div>
  );
}
