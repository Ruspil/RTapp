import { useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { type HRSample } from '@/lib/heartRateUtils'

interface BPMChartProps {
  samples: HRSample[]
  maxHR: number
}

export function BPMChart({ samples, maxHR }: BPMChartProps) {
  if (samples.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-zinc-800 rounded text-zinc-400">
        No data available
      </div>
    )
  }

  // Prepare data for chart
  const startTime = samples[0].timestamp
  const chartData = samples.map((sample, idx) => ({
    time: Math.round((sample.timestamp - startTime) / 1000),
    bpm: sample.bpm,
    zone: sample.zone,
  }))

  const zones = [
    { name: 'Zone 1', min: maxHR * 0.5, max: maxHR * 0.6, color: '#60a5fa' },
    { name: 'Zone 2', min: maxHR * 0.6, max: maxHR * 0.7, color: '#34d399' },
    { name: 'Zone 3', min: maxHR * 0.7, max: maxHR * 0.8, color: '#fbbf24' },
    { name: 'Zone 4', min: maxHR * 0.8, max: maxHR * 0.9, color: '#f97316' },
    { name: 'Zone 5', min: maxHR * 0.9, max: maxHR, color: '#ef4444' },
  ]

  return (
    <div className="w-full h-64 bg-zinc-800 rounded p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis
            dataKey="time"
            label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }}
            stroke="#888"
          />
          <YAxis
            label={{ value: 'BPM', angle: -90, position: 'insideLeft' }}
            domain={[0, maxHR]}
            stroke="#888"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#27272a', border: '1px solid #52525b' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="bpm"
            stroke="#3b82f6"
            dot={false}
            isAnimationActive={false}
            name="Heart Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
