"use client";

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import { ExamResultSubject } from '@/lib/student-marks-types';

interface SubjectBarChartProps {
  subjects: ExamResultSubject[];
  classAverage?: number;
}

export function SubjectBarChart({ subjects, classAverage = 80 }: SubjectBarChartProps) {
  const data = subjects.map((sub) => ({
    name: sub.subjectName,
    shortName: sub.subjectName.length > 10 ? sub.subjectName.substring(0, 8) + '..' : sub.subjectName,
    scored: sub.marksScored,
    max: sub.maxMarks,
    percentage: sub.percentage,
    passMarks: sub.passMarks,
    status: sub.status,
    isTop: sub.isTopScoring,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs border border-slate-700 space-y-1">
          <div className="font-bold text-amber-300 flex items-center justify-between gap-3">
            <span>{item.name}</span>
            {item.isTop && <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">Top Subject</span>}
          </div>
          <div className="text-slate-200">
            Score: <strong className="text-white text-sm">{item.scored}</strong> / {item.max} ({item.percentage}%)
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Pass Threshold: {item.passMarks}</span>
            <span>•</span>
            <span className={item.status === 'Pass' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {item.status.toUpperCase()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 15, left: -15, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} vertical={false} />
          <XAxis
            dataKey="shortName"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 20, 35, 50, 70, 85, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#94a3b8', strokeOpacity: 0.3 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
          />

          {/* Dotted Pass Threshold Line at 35 */}
          <ReferenceLine
            y={35}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: 'Pass Mark (35)',
              position: 'insideTopLeft',
              fill: '#ef4444',
              fontSize: 10,
              fontWeight: 700,
            }}
          />

          {/* Dotted Class Average Marker */}
          {classAverage && (
            <ReferenceLine
              y={classAverage}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Class Avg (${classAverage}%)`,
                position: 'insideTopRight',
                fill: '#6366f1',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}

          <Bar
            dataKey="scored"
            name="Marks Scored"
            radius={[6, 6, 0, 0]}
            maxBarSize={45}
          >
            {data.map((entry, index) => {
              // Color coding: Top = Emerald, Backlog/Fail = Rose, Normal = Indigo
              let fill = '#6366f1'; // Indigo
              if (entry.status === 'Fail') fill = '#f43f5e'; // Rose
              else if (entry.isTop) fill = '#10b981'; // Emerald
              else if (entry.percentage >= 85) fill = '#8b5cf6'; // Purple distinction
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
