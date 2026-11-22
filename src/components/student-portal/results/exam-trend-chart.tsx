"use client";

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ExamResultRecord } from '@/lib/student-marks-types';

interface ExamTrendChartProps {
  records: ExamResultRecord[];
}

export function ExamTrendChart({ records }: ExamTrendChartProps) {
  if (!records || records.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No historical exam records available for trend analysis.
      </div>
    );
  }

  const data = records.map((r, idx) => ({
    examTitle: r.examTitle,
    shortTitle: r.examType || `Exam ${idx + 1}`,
    percentage: r.percentage,
    total: `${r.grandTotal}/${r.maxGrandTotal}`,
    result: r.resultClassification,
    rank: r.rank,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs border border-slate-700 space-y-1">
          <div className="font-bold text-amber-300">{item.examTitle}</div>
          <div className="text-slate-200">
            Percentage: <strong className="text-white text-sm">{item.percentage}%</strong>
          </div>
          <div className="text-slate-300 text-[11px]">
            Score: {item.total} • Classification: {item.result}
          </div>
          {item.rank && (
            <div className="text-indigo-300 font-semibold text-[11px]">Class Rank #{item.rank}</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 25, left: -15, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} vertical={false} />
          <XAxis
            dataKey="shortTitle"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
            axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
            tickLine={false}
          />
          <YAxis
            domain={[40, 100]}
            ticks={[40, 50, 60, 70, 85, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Distinction Benchmark Line */}
          <ReferenceLine
            y={85}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: 'Distinction (85%)',
              position: 'insideTopLeft',
              fill: '#059669',
              fontSize: 10,
              fontWeight: 700,
            }}
          />

          {/* First Class Benchmark Line */}
          <ReferenceLine
            y={60}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: 'First Class (60%)',
              position: 'insideBottomLeft',
              fill: '#2563eb',
              fontSize: 9,
              fontWeight: 600,
            }}
          />

          <Line
            type="monotone"
            dataKey="percentage"
            name="Overall Percentage"
            stroke="#6342e8"
            strokeWidth={3}
            dot={{ r: 6, fill: '#6342e8', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 8, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
