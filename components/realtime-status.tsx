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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Realtime Activity</h3>
        {lastUpdate && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        )}
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activity.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet...</p>
        ) : (
          activity.map((item, i) => (
            <div key={i} className="text-sm text-gray-300 border-b border-gray-700 pb-1 last:border-0">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
