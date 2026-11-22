"use client";

import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { ExamResultSubject } from '@/lib/student-marks-types';

interface StrengthsRadarChartProps {
  subjects: ExamResultSubject[];
}

export function StrengthsRadarChart({ subjects }: StrengthsRadarChartProps) {
  const radarData = subjects.map((sub) => ({
    subject: sub.subjectName.length > 12 ? sub.subjectName.substring(0, 10) + '..' : sub.subjectName,
    fullName: sub.subjectName,
    percentage: sub.percentage,
    category: sub.category,
    marks: `${sub.marksScored}/${sub.maxMarks}`,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs border border-slate-700">
          <div className="font-bold text-amber-300">{data.fullName}</div>
          <div className="text-slate-300 mt-1">
            Category: <span className="font-semibold text-indigo-300">{data.category}</span>
          </div>
          <div className="text-slate-200 mt-0.5">
            Mastery: <strong className="text-white text-sm">{data.percentage}%</strong> ({data.marks})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 9 }}
          />
          <Radar
            name="Subject Mastery"
            dataKey="percentage"
            stroke="#6342e8"
            fill="#6342e8"
            fillOpacity={0.45}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
