
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TransportMode, SearchResult, SearchOptions, Favorite } from './types.ts';
import { fetchTransportData } from './services/transportService.ts';
import { TrainIcon, SwapIcon, StarIcon, TrashIcon, SearchIcon } from './components/icons.tsx';
import DepartureItem from './components/DepartureItem.tsx';
import AutocompleteInput from './components/AutocompleteInput.tsx';
import TimePicker from './components/TimePicker.tsx';

const App: React.FC = () => {
  const mode = TransportMode.SNCB; 
  const [query, setQuery] = useState('');
  const [arrivalQuery, setArrivalQuery] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);
  
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const saved = localStorage.getItem('sncb-easy-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [options, setOptions] = useState<SearchOptions>(() => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('sncb-easy-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setShowTimePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (e?: React.FormEvent, overrideParams?: { from: string, to?: string }) => {
    if (e) e.preventDefault();
    
    const searchFrom = overrideParams?.from || query;
    const searchTo = overrideParams?.to || arrivalQuery;

    if (!searchFrom.trim()) return;

    if (overrideParams) {
      setQuery(overrideParams.from);
      setArrivalQuery(overrideParams.to || '');
    }

    setShowTimePicker(false);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransportData(searchFrom, mode, searchTo, options);
      setResults(data);
    } catch (err: any) {
      setError("Impossible de récupérer les horaires. Vérifiez le nom de la gare.");
    } finally {
      setLoading(false);
    }
  }, [query, arrivalQuery, options]);

  const toggleFavorite = () => {
    const isFav = favorites.some(f => f.from === query && f.to === arrivalQuery);

    if (isFav) {
      setFavorites(favorites.filter(f => !(f.from === query && f.to === arrivalQuery)));
    } else {
      const newFav: Favorite = {
        id: Date.now().toString(),
        mode,
        from: query,
        to: arrivalQuery.trim() !== '' ? arrivalQuery : undefined
      };
      setFavorites([...favorites, newFav]);
    }
  };

  const removeFavoriteById = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(favorites.filter(f => f.id !== id));
  };

  const isCurrentSearchFavorite = favorites.some(f => f.from === query && f.to === arrivalQuery && query !== '');

  const swapStations = () => {
    const temp = query;
    setQuery(arrivalQuery);
    setArrivalQuery(temp);
  };

  return (
    <div className="min-h-screen pb-12 bg-slate-50 overflow-x-hidden">
      <header className="sticky top-0 z-50 glass border-b border-slate-200 py-3 px-4 mb-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white bg-blue-700 shadow-blue-200 shadow-lg shrink-0">
              <TrainIcon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight truncate">SNCB Easy</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">Temps réel iRail</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden xs:inline">Direct</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6">
        <section className="mb-8 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight px-2">
            Prochains <span className="text-blue-700">trains</span>
          </h2>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-4 md:space-y-6">
            <div className="relative flex flex-col gap-3">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Gare de départ</label>
                <AutocompleteInput
                  value={query}
                  onChange={setQuery}
                  mode={mode}
                  placeholder="Ex: Bruxelles-Midi..."
                  borderColor="border-blue-700"
                />
              </div>

              {/* Bouton Swap visible et mieux placé sur mobile */}
              <div className="flex justify-center -my-2 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:z-10">
                <button
                  type="button"
                  onClick={swapStations}
                  className="p-2.5 bg-white border-2 border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-all duration-300 shadow-md active:scale-95 z-20"
                  aria-label="Inverser les gares"
                >
                  <SwapIcon className="w-5 h-5 md:rotate-90" />
                </button>
              </div>
              
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Destination (Optionnel)</label>
                <AutocompleteInput
                  value={arrivalQuery}
                  onChange={setArrivalQuery}
                  mode={mode}
                  placeholder="Où allez-vous ?"
                  borderColor="border-blue-700"
                  icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-2 h-2 rounded-full border-2 border-slate-400"></div></div>}
                />
              </div>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 md:gap-6">
              <div className="flex flex-col gap-1 items-start flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Date</label>
                <input 
                  type="date" 
                  value={options.date}
                  onChange={(e) => setOptions(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none"
                />
              </div>
              
              <div className="flex flex-col gap-1 items-start relative flex-1" ref={timePickerRef}>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Heure</label>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between gap-4 hover:bg-slate-100 transition-all"
                >
                  <span className="text-base">{options.time}</span>
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>

                {showTimePicker && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 z-[110] w-[calc(100vw-2rem)] sm:w-[300px] max-w-xs">
                    <TimePicker 
                      value={options.time} 
                      onChange={(t) => setOptions(prev => ({ ...prev, time: t }))}
                      accentColor="bg-blue-700"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex-[4] h-14 rounded-xl text-white text-base md:text-lg font-bold transition-all shadow-lg bg-blue-700 hover:bg-blue-800 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><SearchIcon className="w-5 h-5" /> Trouver mon train</>}
              </button>
              
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={!query.trim()}
                className={`flex-1 h-14 rounded-xl flex items-center justify-center transition-all border-2 active:scale-95 ${isCurrentSearchFavorite ? 'bg-yellow-50 border-yellow-400 text-yellow-500' : 'bg-white border-slate-200 text-slate-400 hover:border-yellow-400 hover:text-yellow-400'}`}
              >
                <StarIcon className="w-6 h-6" filled={isCurrentSearchFavorite} />
              </button>
            </div>
          </form>

          {favorites.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 px-2">
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => handleSearch(undefined, { from: fav.from, to: fav.to })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:border-blue-200 transition-all max-w-[200px]"
                >
                  <span className="text-xs font-bold text-slate-700 truncate">{fav.from}{fav.to ? ` ➔ ${fav.to}` : ''}</span>
                  <span onClick={(e) => removeFavoriteById(e, fav.id)} className="ml-1 text-slate-300 hover:text-red-500 shrink-0"><TrashIcon className="w-3.5 h-3.5" /></span>
                </button>
              ))}
            </div>
          )}
        </section>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-t-transparent border-blue-700 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Consultation SNCB...</p>
          </div>
        )}

        {results && !loading && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {results.departures.length > 0 ? (
              results.departures.map((dep) => <DepartureItem key={dep.id} departure={dep} mode="SNCB" />)
            ) : (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 px-4">
                <p className="text-slate-500 font-bold text-sm">Aucun train trouvé pour cette recherche.</p>
              </div>
            )}
            
            <p className="text-center text-[9px] text-slate-400 uppercase tracking-widest mt-8 pb-4">Source: iRail / Open Data SNCB</p>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 pt-8 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] px-4">
        &copy; {new Date().getFullYear()} SNCB Easy &bull; Propulsé par iRail
      </footer>
    </div>
  );
};

export default App;
