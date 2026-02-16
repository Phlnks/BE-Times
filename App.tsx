
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TransportMode, SearchResult, SearchOptions, Favorite } from './types.ts';
import { fetchTransportData } from './services/transportService.ts';
import { TrainIcon, BusIcon, TramIcon, SwapIcon, StarIcon, TrashIcon, SearchIcon } from './components/icons.tsx';
import DepartureItem from './components/DepartureItem.tsx';
import AutocompleteInput from './components/AutocompleteInput.tsx';
import TimePicker from './components/TimePicker.tsx';

const App: React.FC = () => {
  const [mode, setMode] = useState<TransportMode>(TransportMode.SNCB);
  const [query, setQuery] = useState('');
  const [arrivalQuery, setArrivalQuery] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);
  
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const saved = localStorage.getItem('betransport-favorites');
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
    localStorage.setItem('betransport-favorites', JSON.stringify(favorites));
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

  const handleSearch = useCallback(async (e?: React.FormEvent, overrideParams?: { mode: TransportMode, from: string, to?: string }) => {
    if (e) e.preventDefault();
    
    const searchMode = overrideParams?.mode || mode;
    const searchFrom = overrideParams?.from || query;
    const searchTo = overrideParams?.to || arrivalQuery;

    if (!searchFrom.trim()) return;

    if (overrideParams) {
      setMode(overrideParams.mode);
      setQuery(overrideParams.from);
      setArrivalQuery(overrideParams.to || '');
    }

    setShowTimePicker(false);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransportData(searchFrom, searchMode, searchMode === TransportMode.SNCB ? searchTo : undefined, options);
      setResults(data);
    } catch (err: any) {
      if (err?.message?.includes('429')) {
        setError("Trop de requêtes. Le quota de l'API est temporairement épuisé. Veuillez patienter une minute.");
      } else {
        setError("Erreur de connexion aux serveurs officiels. Veuillez réessayer.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, arrivalQuery, mode, options]);

  const toggleFavorite = () => {
    const isFav = favorites.some(f => 
      f.mode === mode && f.from === query && f.to === arrivalQuery
    );

    if (isFav) {
      setFavorites(favorites.filter(f => 
        !(f.mode === mode && f.from === query && f.to === arrivalQuery)
      ));
    } else {
      const newFav: Favorite = {
        id: Date.now().toString(),
        mode,
        from: query,
        to: mode === TransportMode.SNCB ? arrivalQuery : undefined
      };
      setFavorites([...favorites, newFav]);
    }
  };

  const removeFavoriteById = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(favorites.filter(f => f.id !== id));
  };

  const isCurrentSearchFavorite = favorites.some(f => 
    f.mode === mode && f.from === query && f.to === arrivalQuery && query !== ''
  );

  const getThemeColor = () => {
    switch (mode) {
      case TransportMode.SNCB: return 'bg-blue-700 hover:bg-blue-800';
      case TransportMode.STIB: return 'bg-red-600 hover:bg-red-700';
      case TransportMode.DeLijn: return 'bg-yellow-400 hover:bg-yellow-500 text-slate-900';
      default: return 'bg-slate-800';
    }
  };

  const getBorderColor = () => {
    switch (mode) {
      case TransportMode.SNCB: return 'border-blue-700';
      case TransportMode.STIB: return 'border-red-600';
      case TransportMode.DeLijn: return 'border-yellow-400';
      default: return 'border-slate-800';
    }
  };

  const getTextColor = () => {
    switch (mode) {
      case TransportMode.SNCB: return 'text-blue-700';
      case TransportMode.STIB: return 'text-red-600';
      case TransportMode.DeLijn: return 'text-yellow-600';
      default: return 'text-slate-800';
    }
  };

  const swapStations = () => {
    const temp = query;
    setQuery(arrivalQuery);
    setArrivalQuery(temp);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-50 glass border-b border-slate-200 py-4 px-6 mb-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${getThemeColor()}`}>
              <TrainIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">BeTransport Live</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Official APIs & Smart Connectors</p>
            </div>
          </div>

          <nav className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            {Object.values(TransportMode).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setResults(null);
                  setError(null);
                  setQuery('');
                  setArrivalQuery('');
                }}
                className={`flex-1 md:px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m 
                    ? `bg-white shadow-sm ${getTextColor()}` 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        <section className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Horaires <span className={getTextColor()}>{mode}</span> en direct
          </h2>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-6">
            <div className={`relative grid ${mode === TransportMode.SNCB ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1'}`}>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Départ</label>
                <AutocompleteInput
                  value={query}
                  onChange={setQuery}
                  mode={mode}
                  placeholder={mode === TransportMode.SNCB ? 'Gare (ex: Namur)...' : `Arrêt (ex: Rogier)...`}
                  borderColor={getBorderColor()}
                />
              </div>

              {mode === TransportMode.SNCB && (
                <>
                  <div className="absolute left-1/2 top-[54px] -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                    <button
                      type="button"
                      onClick={swapStations}
                      className="p-2 bg-white border-2 border-slate-200 rounded-full text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:rotate-180 transition-all duration-300 shadow-sm"
                      title="Inverser les gares"
                    >
                      <SwapIcon className="w-5 h-5 rotate-90" />
                    </button>
                  </div>
                  <div className="flex justify-center md:hidden -my-2 relative z-10">
                    <button
                      type="button"
                      onClick={swapStations}
                      className="p-2 bg-white border-2 border-slate-200 rounded-full text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                      <SwapIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Arrivée (Optionnel)</label>
                    <AutocompleteInput
                      value={arrivalQuery}
                      onChange={setArrivalQuery}
                      mode={mode}
                      placeholder="Destination..."
                      borderColor={getBorderColor()}
                      icon={
                        <div className="w-5 h-5 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-400"></div>
                        </div>
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex flex-col gap-1 items-start w-full md:w-auto">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Date de voyage</label>
                <input 
                  type="date" 
                  value={options.date}
                  onChange={(e) => setOptions(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-1 items-start relative w-full md:w-auto" ref={timePickerRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Heure de départ</label>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 flex items-center justify-between gap-4 hover:bg-slate-100 transition-all"
                >
                  <span className="text-base">{options.time}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>

                {showTimePicker && (
                  <div className="absolute top-full mt-2 left-0 z-[110]">
                    <TimePicker 
                      value={options.time} 
                      onChange={(t) => setOptions(prev => ({ ...prev, time: t }))}
                      accentColor={getThemeColor()}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className={`flex-1 h-14 rounded-xl text-white text-lg font-bold transition-all shadow-xl ${getThemeColor()} disabled:opacity-50 disabled:shadow-none transform active:scale-[0.98] flex items-center justify-center gap-3`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Interrogation...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-5 h-5" />
                    Consulter le direct
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={!query.trim()}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all border-2 ${
                  isCurrentSearchFavorite 
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-500' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-yellow-400 hover:text-yellow-400'
                } disabled:opacity-30`}
                title={isCurrentSearchFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <StarIcon className="w-6 h-6" filled={isCurrentSearchFavorite} />
              </button>
            </div>
          </form>

          {/* Favorites List */}
          {favorites.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <StarIcon className="w-3 h-3 text-yellow-500" filled />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trajets Favoris</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {favorites.map((fav) => (
                  <button
                    key={fav.id}
                    onClick={() => handleSearch(undefined, { mode: fav.mode, from: fav.from, to: fav.to })}
                    className="group relative flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm hover:border-slate-400 hover:shadow-md transition-all whitespace-nowrap"
                  >
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      fav.mode === TransportMode.SNCB ? 'bg-blue-100 text-blue-700' : 
                      fav.mode === TransportMode.STIB ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {fav.mode}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {fav.from}{fav.to ? ` ➔ ${fav.to}` : ''}
                    </span>
                    <span 
                      onClick={(e) => removeFavoriteById(e, fav.id)}
                      className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className={`w-14 h-14 border-4 border-t-transparent rounded-full animate-spin ${mode === TransportMode.SNCB ? 'border-blue-600' : mode === TransportMode.STIB ? 'border-red-600' : 'border-yellow-500'}`}></div>
            <p className="text-slate-500 font-bold animate-pulse tracking-widest uppercase text-xs">
              {mode === TransportMode.SNCB ? "CONNEXION AUX SERVEURS FERROVIAIRES..." : "ACCÈS AUX PORTAILS RÉGIONAUX..."}
            </p>
          </div>
        )}

        {error && (
          <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-center shadow-sm max-w-md mx-auto">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-red-700 font-bold mb-2">Service indisponible.</p>
            <p className="text-red-600 text-sm mb-6 leading-relaxed">{error}</p>
            <button onClick={() => handleSearch()} className="px-6 py-2 bg-white text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-sm">Réessayer</button>
          </div>
        )}

        {!loading && results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span className={`w-1.5 h-8 rounded-full ${getThemeColor()}`}></span>
                {arrivalQuery && mode === TransportMode.SNCB 
                  ? `${query} ➔ ${arrivalQuery}`
                  : `${query}`}
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 shadow-sm px-4 py-1.5 rounded-full flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  OFFICIEL LIVE
                </span>
              </div>
            </div>

            {results.departures.length > 0 ? (
              <div className="grid gap-4">
                {results.departures.map((dep) => (
                  <DepartureItem key={dep.id} departure={dep} mode={mode} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </div>
                <p className="text-slate-500 font-bold text-lg">Aucun passage détecté</p>
                <p className="text-slate-400 text-sm mt-1">Les données officielles pour cet horaire sont vides.</p>
              </div>
            )}

            {results.sources.length > 0 && (
              <div className="pt-10 border-t border-slate-100 flex flex-col items-center">
                <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Provenance des données certifiée</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {results.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:shadow-md transition-all flex items-center gap-2 uppercase tracking-tight"
                    >
                      {mode === TransportMode.SNCB ? '🏛️' : '📡'}
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !results && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
            {[
              { icon: <TrainIcon className="w-8 h-8"/>, title: 'SNCB / NMBS', desc: 'Accès direct aux serveurs ferroviaires nationaux. Précision quai par quai.' },
              { icon: <TramIcon className="w-8 h-8"/>, title: 'STIB / MIVB', desc: 'Réseau Bruxellois. Connecté au portail temps réel officiel pour bus, tram et métro.' },
              { icon: <BusIcon className="w-8 h-8"/>, title: 'De Lijn', desc: 'Réseau Flamand. Analyse intelligente des passages en direct sur tout le réseau.' },
            ].map((feature, i) => (
              <div key={i} className="p-10 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl mb-8 flex items-center justify-center ${i === 0 ? 'bg-blue-50 text-blue-600' : i === 1 ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  {feature.icon}
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 pt-10 text-center text-slate-400 text-xs font-bold tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} BeTransport Live &bull; Powered by Official Data & Gemini Flash</p>
      </footer>
    </div>
  );
};

export default App;
