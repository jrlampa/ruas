import React, { useState, useEffect } from 'react';
import { Download, Map as MapIcon, Layers, Search, Loader2, AlertCircle, Settings, Mountain } from 'lucide-react';
import { OsmElement, AnalysisStats, TerrainGrid, GlobalState, AppSettings, GeoLocation } from './types';
import { DEFAULT_LOCATION, MAX_RADIUS, MIN_RADIUS } from './constants';
import MapPreview from './components/MapPreview';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import HistoryControls from './components/HistoryControls';
import { useUndoRedo } from './hooks/useUndoRedo';

import { fetchOsmData } from './services/osmService';
import { generateDXF, calculateStats } from './services/dxfService';
import { findLocationWithGemini, analyzeArea } from './services/geminiService';
import { fetchElevationGrid } from './services/elevationService';

function App() {
  // Global State with Undo/Redo
  const { 
    state: appState, 
    setState: setAppState, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    saveSnapshot
  } = useUndoRedo<GlobalState>({
    center: DEFAULT_LOCATION,
    radius: 500,
    settings: {
      enableAI: true,
      simplifyGeometry: true
    }
  });

  // Derived state from undoable appState
  const { center, radius, settings } = appState;

  // Ephemeral State (No undo)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  
  const [osmData, setOsmData] = useState<OsmElement[] | null>(null);
  const [terrainData, setTerrainData] = useState<TerrainGrid | null>(null);
  
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Update Settings Wrapper
  const updateSettings = (newSettings: AppSettings) => {
    setAppState({ ...appState, settings: newSettings }, true);
  };

  // Handlers
  const handleMapClick = (newCenter: GeoLocation) => {
    // When manually clicking, we treat it as a new distinct action in history
    setAppState({ ...appState, center: newCenter }, true);
    
    // Clear existing data as coordinates changed
    setOsmData(null);
    setTerrainData(null);
    setStats(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    
    const location = await findLocationWithGemini(searchQuery, settings.enableAI);
    
    if (location) {
      setAppState({ ...appState, center: location }, true);
      setOsmData(null); 
      setTerrainData(null);
      setStats(null);
    } else {
      setError(settings.enableAI 
        ? "Could not find that location." 
        : "AI is disabled. Cannot search. (Enable AI in settings)");
    }
    setIsSearching(false);
  };

  const handleFetchAndAnalyze = async () => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage('Starting...');
    
    try {
      // 1. Fetch OSM Data
      setStatusMessage('Fetching OSM Data...');
      const data = await fetchOsmData(center.lat, center.lng, radius);
      if (data.length === 0) {
        throw new Error("No data found in this area. Try increasing the radius.");
      }
      setOsmData(data);

      // 2. Fetch Terrain Data
      setStatusMessage('Fetching Elevation Data...');
      const terrain = await fetchElevationGrid(center, radius);
      setTerrainData(terrain);

      // 3. Calculate Stats
      const calculatedStats = calculateStats(data);
      setStats(calculatedStats);

      // 4. Get Gemini Analysis
      if (settings.enableAI) {
        setStatusMessage('Analyzing with AI...');
        const text = await analyzeArea(calculatedStats, center.label || "the selected area", true);
        setAnalysisText(text);
      } else {
        setAnalysisText("AI Analysis Disabled.");
      }

      setStatusMessage('');

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDxf = async () => {
    if (!osmData) return;
    setIsDownloading(true);
    try {
      const dxfString = await generateDXF(osmData, center, terrainData || undefined, { simplify: settings.simplifyGeometry });
      
      const blob = new Blob([dxfString], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osm_export_${center.lat.toFixed(4)}_${center.lng.toFixed(4)}.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Failed to generate/download DXF from backend.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Get current location on mount (only if center is default)
  useEffect(() => {
    if (center.lat === DEFAULT_LOCATION.lat && center.lng === DEFAULT_LOCATION.lng) {
        if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition((position) => {
             // We don't want this initial location set to be undoable necessarily, 
             // or maybe we do? Let's replace the initial state.
             setAppState({
               ...appState,
               center: {
                 lat: position.coords.latitude,
                 lng: position.coords.longitude,
                 label: "Current Location"
               }
             }, false); // Replace, don't push
           }, (err) => {
             console.log("Geolocation permission denied, using default.");
           });
        }
    }
  }, []); // Run once on mount

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-200">
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
             <Layers size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">OSM to DXF <span className="text-blue-400 font-mono text-sm">2.5D</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          
          <HistoryControls 
            canUndo={canUndo} 
            canRedo={canRedo} 
            onUndo={undo} 
            onRedo={redo} 
          />

          <div className="hidden md:flex items-center gap-4 text-sm text-slate-400">
            <span>Engine: Node.js Backend</span>
            <div className="h-4 w-px bg-slate-700"></div>
            <span className={settings.enableAI ? "text-green-400 flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
              {settings.enableAI ? "● AI Enabled" : "○ AI Disabled"}
            </span>
          </div>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700"
            title="Configuration"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Controls */}
        <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col p-6 gap-6 overflow-y-auto z-10 shadow-xl">
          
          {/* Search Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Location</label>
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                placeholder='e.g., "Eiffel Tower" or "Central Park"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-slate-500"
              />
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <button 
                type="submit" 
                disabled={isSearching || !searchQuery}
                className="absolute right-2 top-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="animate-spin" size={14} /> : "Find"}
              </button>
            </form>
            {center.label && (
              <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-900/50">
                <MapIcon size={12} />
                <span className="truncate">{center.label} ({center.lat.toFixed(4)}, {center.lng.toFixed(4)})</span>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800"></div>

          {/* Radius Control */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Extraction Radius</label>
              <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-white">{radius}m</span>
            </div>
            <input 
              type="range" 
              min={MIN_RADIUS} 
              max={MAX_RADIUS} 
              step={10}
              value={radius}
              // Snapshot state before dragging starts (or rather, ensure first move pushes previous state)
              onMouseDown={saveSnapshot} 
              // Touch support
              onTouchStart={saveSnapshot}
              onChange={(e) => {
                  const r = parseInt(e.target.value);
                  setAppState({ ...appState, radius: r }, false); // Update current state without pushing to history stack
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500">
              Includes terrain elevation & 2.5D buildings.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              onClick={handleFetchAndAnalyze}
              disabled={isProcessing}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all shadow-lg ${
                isProcessing 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {statusMessage || 'Processing...'}
                </>
              ) : (
                <>
                  <Settings size={18} />
                  Analyze Area
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Results Section */}
          {osmData && stats && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 mt-auto">
               <div className="h-px bg-slate-800"></div>
               <Dashboard stats={stats} analysisText={analysisText} />
               
               <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-3 text-xs text-slate-400 border border-slate-800">
                  <Mountain size={16} />
                  <span>Terrain data: {terrainData ? 'Ready' : 'Unavailable'}</span>
               </div>

               <button
                onClick={handleDownloadDxf}
                disabled={isDownloading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-green-900/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
               >
                 {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                 {isDownloading ? 'Generating on Backend...' : 'Download .DXF'}
               </button>
            </div>
          )}

        </aside>

        {/* Map Area */}
        <section className="flex-1 bg-slate-950 relative p-4">
          <MapPreview center={center} radius={radius} onCenterChange={handleMapClick} />
        </section>

      </main>
    </div>
  );
}

export default App;