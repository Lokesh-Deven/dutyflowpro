"use client";

import React from 'react';
import { RoomSeatingPlan, BenchPositionSeat } from '@/lib/student-seating-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DoorOpen, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface RoomSeatingDiagramProps {
  plan: RoomSeatingPlan;
  examName?: string;
  examDate?: string;
  examTime?: string;
  className?: string;
}

export function RoomSeatingDiagram({
  plan,
  examName,
  examDate,
  examTime,
  className,
}: RoomSeatingDiagramProps) {
  const leftBenches = plan.benches.filter((b) => b.side === 'LEFT');
  const rightBenches = plan.benches.filter((b) => b.side === 'RIGHT');

  const renderSeat = (seat: BenchPositionSeat, index: number, totalSeats: number) => {
    const isVacant = !seat.student;
    const posLabel =
      seat.position === 'SIDE_A' ? 'Side A' : seat.position === 'SIDE_B' ? 'Side B' : 'Center';

    return (
      <div
        key={index}
        className={cn(
          "flex-1 p-2 rounded-lg border text-center transition-all flex flex-col justify-between min-w-[70px]",
          isVacant
            ? "bg-slate-50/70 border-dashed border-slate-200 text-slate-400"
            : "bg-white border-slate-200 shadow-2xs hover:border-indigo-300"
        )}
      >
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
          <span className="uppercase tracking-wider text-[9px] text-slate-500 font-semibold">{posLabel}</span>
          {seat.subjectName && (
            <span className="truncate max-w-[65px] text-[9px] text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-medium">
              {seat.subjectName}
            </span>
          )}
        </div>

        {isVacant ? (
          <div className="py-2.5 text-center">
            <span className="text-[10px] italic text-slate-400 font-medium">VACANT</span>
          </div>
        ) : (
          <div className="space-y-0.5 my-0.5">
            <div className="font-headline font-black text-xs text-slate-900 tracking-tight">
              {seat.student!.rollNo}
            </div>
            <div className="text-[11px] font-medium text-slate-700 truncate" title={seat.student!.name}>
              {seat.student!.name}
            </div>
            {seat.student!.section && (
              <div className="text-[9px] text-slate-400 font-medium">
                Sec: {seat.student!.section}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5", className)}>
      {/* Room Diagram Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1E2A5E]/10 text-[#1E2A5E] rounded-lg">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-slate-800">
                Room No. {plan.roomNo}
              </h3>
              <p className="text-xs text-slate-500">
                {examName || 'Examination'} &bull; {examDate || 'Scheduled Date'} {examTime ? `(${examTime})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Capacity Metrics */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-50 text-slate-700 text-xs py-1 px-2.5 font-semibold">
            Capacity: {plan.capacity}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-1 px-2.5 font-semibold">
            Allocated: {plan.allocatedCount}
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-1 px-2.5 font-semibold">
            Vacant: {plan.vacantCount}
          </Badge>
        </div>
      </div>

      {/* Two Column Graphical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side Benches */}
        <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E]">
              Left Side Benches ({leftBenches.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Benches 01 &rarr; {String(leftBenches.length).padStart(2, '0')}</span>
          </div>

          <div className="space-y-2.5">
            {leftBenches.map((bench) => (
              <div
                key={`left-${bench.benchNumber}`}
                className="flex items-stretch gap-2 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs"
              >
                {/* Bench Number Indicator */}
                <div className="w-9 shrink-0 bg-slate-100/80 rounded-md flex flex-col items-center justify-center font-headline font-bold text-xs text-slate-600 border border-slate-200/50">
                  <span className="text-[9px] uppercase text-slate-400 font-medium">B</span>
                  {String(bench.benchNumber).padStart(2, '0')}
                </div>

                {/* Bench Physical Seat Slots */}
                <div className="flex-1 flex gap-2">
                  {bench.seats.map((seat, sIdx) => renderSeat(seat, sIdx, bench.seats.length))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Benches */}
        <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E]">
              Right Side Benches ({rightBenches.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Benches 01 &rarr; {String(rightBenches.length).padStart(2, '0')}</span>
          </div>

          <div className="space-y-2.5">
            {rightBenches.map((bench) => (
              <div
                key={`right-${bench.benchNumber}`}
                className="flex items-stretch gap-2 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs"
              >
                {/* Bench Number Indicator */}
                <div className="w-9 shrink-0 bg-slate-100/80 rounded-md flex flex-col items-center justify-center font-headline font-bold text-xs text-slate-600 border border-slate-200/50">
                  <span className="text-[9px] uppercase text-slate-400 font-medium">B</span>
                  {String(bench.benchNumber).padStart(2, '0')}
                </div>

                {/* Bench Physical Seat Slots */}
                <div className="flex-1 flex gap-2">
                  {bench.seats.map((seat, sIdx) => renderSeat(seat, sIdx, bench.seats.length))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
