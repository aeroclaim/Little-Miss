import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dataLayer } from '@/data/dataLayer';
import { buildModel } from '@/lib/logic/model';

export const QUERY_KEY = ['appData'];
const DataContext = createContext(null);

// Loads every table once through the data layer and derives the whole model with pure functions.
export function DataProvider({ children }) {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => dataLayer.loadAll(), staleTime: Infinity });
  const data = query.data;
  const model = useMemo(() => (data ? buildModel(data) : null), [data]);
  const value = useMemo(
    () => ({ data, model, isLoading: query.isLoading, error: query.error, refetch: query.refetch }),
    [data, model, query.isLoading, query.error, query.refetch]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  return useContext(DataContext);
}