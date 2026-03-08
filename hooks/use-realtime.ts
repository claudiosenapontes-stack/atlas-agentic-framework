'use client'

import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeTasks(callback: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [callback])
}

export function useRealtimeApprovals(callback: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, callback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [callback])
}

export function useRealtimeIncidents(callback: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, callback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [callback])
}

export function useRealtimeExecutions(callback: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('executions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executions' }, callback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [callback])
}
