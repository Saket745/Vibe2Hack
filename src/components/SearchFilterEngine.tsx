import { useState, useEffect } from 'react';
import { Filter, Search, X } from 'lucide-react';

export interface FilterState {
  keyword: string;
  category: string;
  severity: string;
  status: string;
  wardId: string;
  dateRange: string;
  sortBy: string;
}

interface SearchFilterEngineProps {
  role: 'citizen' | 'worker';
  onFilterChange: (filters: FilterState) => void;
}

export default function SearchFilterEngine({ role, onFilterChange }: SearchFilterEngineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    category: 'all',
    severity: 'all',
    status: 'all',
    wardId: 'all',
    dateRange: 'all',
    sortBy: 'newest'
  });

  // Debounce keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      category: 'all',
      severity: 'all',
      status: 'all',
      wardId: 'all',
      dateRange: 'all',
      sortBy: 'newest'
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => 
    k !== 'keyword' && k !== 'sortBy' && v !== 'all'
  ).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 mb-4 space-y-3 transition-all">
      {/* Search Bar */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search reports by description..."
            value={filters.keyword}
            onChange={(e) => handleChange('keyword', e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors dark:text-white"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors border ${
            isOpen || activeFilterCount > 0
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-purple-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {isOpen && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Category</label>
            <select 
              value={filters.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="pothole">Pothole</option>
              <option value="garbage">Garbage</option>
              <option value="streetlight">Streetlight</option>
              <option value="water leakage">Water Leakage</option>
              <option value="drainage">Drainage</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Severity</label>
            <select 
              value={filters.severity}
              onChange={(e) => handleChange('severity', e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</label>
            <select 
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              {role === 'worker' && <option value="needs_manual_review">Needs Manual Review</option>}
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sort By</label>
            <select 
              value={filters.sortBy}
              onChange={(e) => handleChange('sortBy', e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_priority">Highest Priority</option>
              {role === 'citizen' && <option value="nearest">Nearest (Proximity)</option>}
            </select>
          </div>

          <div className="space-y-1.5 col-span-2 md:col-span-2 flex items-end justify-end">
             {activeFilterCount > 0 && (
               <button 
                 onClick={clearFilters}
                 className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-2"
               >
                 <X className="w-3 h-3" />
                 Clear Filters
               </button>
             )}
          </div>

        </div>
      )}
    </div>
  );
}
