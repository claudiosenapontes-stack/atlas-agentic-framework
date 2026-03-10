'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRealtimeTasks, useRealtimeApprovals, useRealtimeIncidents, useRealtimeExecutions } from '@/hooks/use-realtime'

export function RealtimeStatus() {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [activity, setActivity] = useState<string[]>([])

  const addActivity = useCallback((message: string) => {
    setActivity(prev => [message, ...prev.slice(0, 9)])
    setLastUpdate(new Date().toLocaleTimeString())
  }, [])

  useRealtimeTasks(useCallback((payload) => {
    addActivity(`Task ${payload.eventType}: ${payload.new?.title || payload.old?.title || 'Unknown'}`)
  }, [addActivity]))

  useRealtimeApprovals(useCallback((payload) => {
    addActivity(`Approval ${payload.eventType}: ${payload.new?.status || payload.old?.status}`)
  }, [addActivity]))

  useRealtimeIncidents(useCallback((payload) => {
    addActivity(`Incident ${payload.eventType}: ${payload.new?.severity || payload.old?.severity}`)
  }, [addActivity]))

  useRealtimeExecutions(useCallback((payload) => {
    addActivity(`Execution ${payload.eventType}: ${payload.new?.status || payload.old?.status}`)
  }, [addActivity]))

  return (
    <div className="bg-white rounded-lg p-4 border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-900">Realtime Activity</h3>
        {lastUpdate && (
          <span className="text-xs text-green-700 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Live
          </span>
        )}
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activity.length === 0 ? (
          <p className="text-stone-500 text-sm">No activity yet...</p>
        ) : (
          activity.map((item, i) => (
            <div key={i} className="text-sm text-stone-700 border-b border-stone-100 pb-1 last:border-0">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
