import React from 'react';
import { X, Cpu, Zap } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const toggleAI = () => onUpdateSettings({ ...settings, enableAI: !settings.enableAI });
  const toggleSimplify = () => onUpdateSettings({ ...settings, simplifyGeometry: !settings.simplifyGeometry });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu size={24} className="text-blue-500" />
            Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* AI Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label className="text-base font-semibold text-white flex items-center gap-2">
                Enable AI Services
                {settings.enableAI && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">ACTIVE</span>}
              </label>
              <p className="text-sm text-slate-400">
                Uses Gemini to analyze urban density and perform fuzzy location searches.
              </p>
            </div>
            <button 
              onClick={toggleAI}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableAI ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableAI ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Simplification Toggle */}
          <div className="flex items-start justify-between gap-4">
             <div className="space-y-1">
              <label className="text-base font-semibold text-white flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" />
                Simplify Geometry
              </label>
              <p className="text-sm text-slate-400">
                Reduces polyline points (RDP algorithm) to optimize DXF file size for CAD.
              </p>
            </div>
             <button 
              onClick={toggleSimplify}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.simplifyGeometry ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.simplifyGeometry ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;