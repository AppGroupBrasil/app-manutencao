import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, CalendarDays } from 'lucide-react';

interface SmartSearchProps {
  placeholder?: string;
  onSearch: (query: string, dateFrom?: string, dateTo?: string) => void;
  showDateFilter?: boolean;
}

export default function SmartSearch({ placeholder = 'Buscar...', onSearch, showDateFilter = true }: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDates, setShowDates] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query, dateFrom || undefined, dateTo || undefined);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, dateFrom, dateTo]);

  return (
    <div className="px-4 mb-4 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        {showDateFilter && (
          <button
            onClick={() => setShowDates(!showDates)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
              showDates ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDates && (
        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="self-end pb-2 text-xs text-destructive hover:underline"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
