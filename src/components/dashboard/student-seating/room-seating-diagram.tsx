"use client";

import React from 'react';
import { RoomSeatingPlan, BenchPositionSeat } from '@/lib/student-seating-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DoorOpen, Users, CheckCircle2, AlertCircle, Presentation, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';

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

      {/* Representational Blackboard / Front of Classroom */}
      <div className="relative overflow-hidden rounded-xl border-[3px] border-[#5c3a21] bg-[#422513] shadow-md">
        {/* Top Wood Frame Bevel Highlight */}
        <div className="h-1 bg-[#7d5131] border-b border-[#361e0f]" />

        {/* Blackboard Surface */}
        <div className="m-2 sm:m-2.5 p-3.5 sm:p-4 rounded-lg bg-gradient-to-b from-[#18382b] via-[#142f24] to-[#0f241c] border border-emerald-500/25 text-white relative shadow-inner">
          {/* Subtle Corner Screws */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300/30 border border-black/20" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300/30 border border-black/20" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-300/30 border border-black/20" />
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-300/30 border border-black/20" />

          <div className="flex flex-col items-center text-center space-y-2.5">
            {/* Center Blackboard Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-400/30 text-emerald-100 text-xs font-bold tracking-wider uppercase shadow-xs">
              <Presentation className="w-3.5 h-3.5 text-emerald-300" />
              <span>Blackboard &bull; Front of Room (Teacher&apos;s Stage)</span>
            </div>

            {/* Directional Orientation Guide Bar */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-2 pt-1 border-t border-emerald-500/20">
              {/* Left Column Orientation */}
              <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-100 font-bold text-xs bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/30 shadow-xs">
                <ArrowLeft className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="uppercase tracking-wider">Left Side Benches</span>
                <span className="text-[10px] text-emerald-300/80 font-normal">({leftBenches.length} Benches)</span>
              </div>

              {/* Center Facing Indicator */}
              <div className="flex flex-col items-center justify-center text-center py-0.5">
                <div className="text-[11px] font-black text-amber-300 tracking-wider uppercase flex items-center gap-1">
                  <span>&#9650; Facing The Blackboard &#9650;</span>
                </div>
                <div className="text-[10px] text-emerald-200/90 font-medium">
                  Facing the board, benches on your left and right match below
                </div>
              </div>

              {/* Right Column Orientation */}
              <div className="flex items-center justify-center md:justify-end gap-2 text-emerald-100 font-bold text-xs bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/30 shadow-xs">
                <span className="text-[10px] text-emerald-300/80 font-normal">({rightBenches.length} Benches)</span>
                <span className="uppercase tracking-wider">Right Side Benches</span>
                <ArrowRight className="w-4 h-4 text-emerald-300 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wooden Chalk Tray with Chalk Pieces & Duster */}
        <div className="h-3.5 bg-[#311b0d] px-6 flex items-center justify-end gap-2.5 border-t border-[#4a2914]">
          {/* Felt Chalk Duster */}
          <div className="flex items-center" title="Chalk Duster">
            <div className="w-7 h-2 bg-[#854d0e] rounded-xs border-b border-[#f59e0b]/40 shadow-xs flex items-center justify-center">
              <div className="w-5 h-0.5 bg-[#542d0c] rounded-xs" />
            </div>
          </div>
          {/* White Chalk */}
          <div className="w-3.5 h-1.5 bg-white rounded-xs shadow-xs" title="White Chalk" />
          {/* Yellow Chalk */}
          <div className="w-3 h-1.5 bg-amber-200 rounded-xs shadow-xs" title="Yellow Chalk" />
        </div>
      </div>

      {/* Two Column Graphical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side Benches */}
        <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] flex items-center gap-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
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
                <div className="w-12 shrink-0 bg-slate-100/80 rounded-md flex flex-col items-center justify-center font-headline font-bold text-xs text-slate-600 border border-slate-200/50 py-1">
                  <span className="text-[9px] uppercase text-slate-400 font-medium">B</span>
                  <span>{String(bench.benchNumber).padStart(2, '0')}</span>
                  {bench.rowLabel && (
                    <span className="mt-1 text-[8px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1 py-0.2 rounded-xs whitespace-nowrap">
                      {bench.rowLabel}
                    </span>
                  )}
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
            <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] flex items-center gap-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
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
                <div className="w-12 shrink-0 bg-slate-100/80 rounded-md flex flex-col items-center justify-center font-headline font-bold text-xs text-slate-600 border border-slate-200/50 py-1">
                  <span className="text-[9px] uppercase text-slate-400 font-medium">B</span>
                  <span>{String(bench.benchNumber).padStart(2, '0')}</span>
                  {bench.rowLabel && (
                    <span className="mt-1 text-[8px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1 py-0.2 rounded-xs whitespace-nowrap">
                      {bench.rowLabel}
                    </span>
                  )}
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
