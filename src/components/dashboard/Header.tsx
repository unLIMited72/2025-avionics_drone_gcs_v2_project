import { Radio, X } from 'lucide-react';

interface HeaderProps {
  droneId: string;
  onDisconnect: () => void;
}

export default function Header({ droneId, onDisconnect }: HeaderProps) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-sky-500/20 rounded-lg border border-sky-500/50">
            <Radio className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-xs">Drone GCS</h2>
            <p className="text-slate-400 text-xs">ID: {droneId}</p>
          </div>
        </div>

        <button
          onClick={onDisconnect}
          className="p-2 hover:bg-red-600 bg-red-500 rounded-lg transition-colors"
          title="Disconnect"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
