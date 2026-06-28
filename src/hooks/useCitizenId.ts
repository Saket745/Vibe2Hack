import { useState, useEffect } from 'react';

// Generates something like CIT-7KQ2-P9X
export function generateCitizenId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const getChunk = (len: number) => Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CIT-${getChunk(4)}-${getChunk(3)}`;
}

export function useCitizenId() {
  const [citizenId, setCitizenId] = useState<string>('');

  useEffect(() => {
    let stored = localStorage.getItem('reporter_id');
    if (!stored || !stored.startsWith('CIT-')) {
      stored = generateCitizenId();
      localStorage.setItem('reporter_id', stored);
    }
    setCitizenId(stored);
  }, []);

  const restoreCitizenId = (id: string) => {
    if (id.startsWith('CIT-')) {
      localStorage.setItem('reporter_id', id);
      setCitizenId(id);
      return true;
    }
    return false;
  };

  return { citizenId, restoreCitizenId };
}