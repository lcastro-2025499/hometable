'use client';

import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export function useSupabase() {
  const client = useMemo(() => supabase, []);
  return client;
}