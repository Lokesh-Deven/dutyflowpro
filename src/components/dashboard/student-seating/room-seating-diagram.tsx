"use client";

import React from 'react';
import { RoomSeatingPlan, BenchPositionSeat } from '@/lib/student-seating-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DoorOpen, Users, CheckCircle2, AlertCircle, Presentation, ArrowLeft, ArrowRight, ArrowDown, BookOpen } from 'lucide-react';
import { getSubjectColor } from '@/lib/student-seating-colors';

interface RoomSeatingDiagramProps {
  plan: RoomSeatingPlan;
  examName?: string;
  examDate?: string;
  examTime?: string;
  className?: string;
  allSubjectNames?: string[];
}

export function RoomSeatingDiagram({
  plan,
  examName,
  examDate,
  examTime,
  className,
  allSubjectNames,
}: RoomSeatingDiagramProps) {
  const leftBenches = plan.benches.filter((b) => b.side === 'LEFT');
  const middleBenches = plan.benches.filter((b) => b.side === 'MIDDLE');
  const rightBenches = plan.benches.filter((b) => b.side === 'RIGHT');
  const hasMiddleColumn = middleBenches.length > 0;

  // Compute unique subjects and their allocated student counts in this room
  const roomSubjects = React.useMemo(() => {
    const map = new Map<string, number>();
    let studentCount = 0;
    plan.benches.forEach((bench) => {
      bench.seats.forEach((seat) => {
        if (seat.student && seat.subjectName) {
          studentCount++;
          map.set(seat.subjectName, (map.get(seat.subjectName) || 0) + 1);
        }
      });
    });
    // Fallback if no students allocated yet (e.g. empty room template preview)
    if (studentCount === 0) {
      plan.benches.forEach((bench) => {
        bench.seats.forEach((seat) => {
          if (seat.subjectName) {
            map.set(seat.subjectName, (map.get(seat.subjectName) || 0) + 1);
          }
        });
      });
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [plan]);

  const uniqueSubjectNames = React.useMemo(
    () => roomSubjects.map((s) => s.name),
    [roomSubjects]
  );

  const subjectNamesForColors = React.useMemo(() => {
    if (allSubjectNames && allSubjectNames.length > 0) return allSubjectNames;
    return uniqueSubjectNames;
  }, [allSubjectNames, uniqueSubjectNames]);

  const renderSeat = (seat: BenchPositionSeat, index: number, totalSeats: number) => {
    const isVacant = !seat.student;
    const posLabel =
      seat.position === 'SIDE_A' ? 'Side A' : seat.position === 'SIDE_B' ? 'Side B' : 'Center';

    if (seat.isDisabled) {
      return (
        <div
          key={index}
          className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 text-center flex flex-col justify-between min-w-[70px] select-none opacity-60"
        >
          <div className="flex items-center justify-between text-[10px] font-bold mb-1 gap-1">
            <span className="uppercase tracking-wider text-[9px] text-slate-400 dark:text-slate-500 font-bold shrink-0">
              {posLabel}
            </span>
          </div>
          <div className="py-3 text-center flex flex-col items-center justify-center my-auto min-h-[46px]">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-200/90 dark:bg-slate-700/80 px-2 py-0.5 rounded border border-slate-300/80 dark:border-slate-600 shadow-3xs">
              Disabled
            </span>
          </div>
        </div>
      );
    }

    const subjStyle = seat.subjectName
      ? getSubjectColor(seat.subjectName, subjectNamesForColors)
      : null;

    return (
      <div
        key={index}
        className={cn(
          "flex-1 p-2 rounded-lg border text-center transition-all flex flex-col justify-between min-w-[70px]",
          isVacant
            ? "bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600"
        )}
        style={
          !isVacant && subjStyle
            ? {
                backgroundColor: subjStyle.seatBgCss,
                borderTopColor: subjStyle.accentBorderCss,
                borderTopWidth: '3px',
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between text-[10px] font-bold mb-1 gap-1">
          <span className="uppercase tracking-wider text-[9px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
            {posLabel}
          </span>
          {seat.student?.section && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[45px]">
              Sec {seat.student.section}
            </span>
          )}
        </div>

        {isVacant ? (
          <div className="py-3 text-center flex flex-col items-center justify-center my-auto min-h-[46px]">
            <span className="text-[10px] italic text-slate-400 dark:text-slate-500 font-medium tracking-wide">
              VACANT
            </span>
          </div>
        ) : (
          <div className="space-y-0.5 my-0.5">
            <div className="font-headline font-black text-xs text-slate-900 dark:text-white tracking-tight">
              {seat.student!.rollNo}
            </div>
            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate" title={seat.student!.name}>
              {seat.student!.name}
            </div>
            {seat.subjectName && subjStyle && (
              <div
                className="mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-center truncate border shadow-3xs"
                style={{
                  backgroundColor: subjStyle.bgCss,
                  color: subjStyle.textCss,
                  borderColor: subjStyle.borderCss,
                }}
                title={`Subject: ${seat.subjectName}`}
              >
                {seat.subjectName}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderBenchCard = (bench: typeof plan.benches[0], keyPrefix: string) => {
    const benchPrefix = bench.side === 'LEFT' ? 'L' : bench.side === 'MIDDLE' ? 'M' : 'R';
    const benchLabel = `${benchPrefix}${bench.benchNumber}`;

    return (
      <div
        key={`${keyPrefix}-${bench.benchNumber}`}
        className="flex items-stretch gap-2 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs min-w-0"
      >
        {/* Bench Number Indicator */}
        <div className="w-11 sm:w-12 shrink-0 bg-slate-100/80 dark:bg-slate-800/80 rounded-md flex flex-col items-center justify-center font-headline font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 py-1">
          <span className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wide">BENCH</span>
          <span className="font-extrabold tracking-tight">{benchLabel}</span>
          {bench.rowLabel && (
            <span className="mt-1 text-[8px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 px-1 py-0.2 rounded-xs whitespace-nowrap">
              {bench.rowLabel}
            </span>
          )}
        </div>

        {/* Bench Physical Seat Slots */}
        <div className="flex-1 flex gap-1.5 sm:gap-2 min-w-0">
          {bench.seats.map((seat, sIdx) => renderSeat(seat, sIdx, bench.seats.length))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4", className)}>
      {/* Room Diagram Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1E2A5E]/10 dark:bg-indigo-950/40 text-[#1E2A5E] dark:text-indigo-400 rounded-lg">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-slate-800 dark:text-slate-100">
                Room No. {plan.roomNo}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {examName || 'Examination'} &bull; {examDate || 'Scheduled Date'} {examTime ? `(${examTime})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Capacity Metrics */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs py-1 px-2.5 font-semibold">
            Capacity: {plan.capacity}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs py-1 px-2.5 font-semibold">
            Allocated: {plan.allocatedCount}
          </Badge>
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs py-1 px-2.5 font-semibold">
            Vacant: {plan.vacantCount}
          </Badge>
        </div>
      </div>

      {/* Subject Highlight Legend Bar */}
      {roomSubjects.length > 0 && (
        <div className="bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Allocated Subjects ({roomSubjects.length}):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {roomSubjects.map((sub) => {
              const style = getSubjectColor(sub.name, subjectNamesForColors);
              return (
                <span
                  key={sub.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border shadow-3xs transition-transform hover:scale-[1.02]"
                  style={{
                    backgroundColor: style.bgCss,
                    color: style.textCss,
                    borderColor: style.borderCss,
                  }}
                  title={`${sub.count} seats allocated in this room`}
                >
                  <span
                    className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: style.dotColor }}
                  />
                  <span>{sub.name}</span>
                  <span className="text-[10px] font-semibold opacity-75">
                    &bull; {sub.count} {sub.count === 1 ? 'seat' : 'seats'}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

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
            {hasMiddleColumn ? (
              /* 3-Column Orientation */
              <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-2 pt-1 border-t border-emerald-500/20">
                {/* Left Column */}
                <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-100 font-bold text-xs bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/30 shadow-xs">
                  <ArrowLeft className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="uppercase tracking-wider">Left Side Benches</span>
                  <span className="text-[10px] text-emerald-300/80 font-normal">({leftBenches.length} Benches)</span>
                </div>

                {/* Middle Column */}
                <div className="flex items-center justify-center gap-2 text-emerald-100 font-bold text-xs bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/30 shadow-xs">
                  <ArrowDown className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="uppercase tracking-wider">Middle Benches</span>
                  <span className="text-[10px] text-emerald-300/80 font-normal">({middleBenches.length} Benches)</span>
                </div>

                {/* Right Column */}
                <div className="flex items-center justify-center md:justify-end gap-2 text-emerald-100 font-bold text-xs bg-emerald-900/40 px-3 py-1.5 rounded-md border border-emerald-500/30 shadow-xs">
                  <span className="text-[10px] text-emerald-300/80 font-normal">({rightBenches.length} Benches)</span>
                  <span className="uppercase tracking-wider">Right Side Benches</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300 shrink-0" />
                </div>
              </div>
            ) : (
              /* 2-Column Orientation */
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
            )}
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

      {/* Graphical Layout (2-Column or 3-Column based on room configuration) */}
      {hasMiddleColumn ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 min-w-[980px]">
            {/* Left Side Benches */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 min-w-0">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300 flex items-center gap-1.5">
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Left Side Benches ({leftBenches.length})
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Benches 1 &rarr; {leftBenches.length}</span>
              </div>

              <div className="space-y-2.5">
                {leftBenches.map((bench) => renderBenchCard(bench, 'left'))}
              </div>
            </div>

            {/* Middle Benches */}
            <div className="space-y-3 bg-indigo-50/20 dark:bg-indigo-950/20 p-3.5 sm:p-4 rounded-xl border border-indigo-100/70 dark:border-indigo-900/50 min-w-0">
              <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/60 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Middle Benches ({middleBenches.length})
                </span>
                <span className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 font-medium">Benches 1 &rarr; {middleBenches.length}</span>
              </div>

              <div className="space-y-2.5">
                {middleBenches.map((bench) => renderBenchCard(bench, 'middle'))}
              </div>
            </div>

            {/* Right Side Benches */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 min-w-0">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300 flex items-center gap-1.5">
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Right Side Benches ({rightBenches.length})
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Benches 1 &rarr; {rightBenches.length}</span>
              </div>

              <div className="space-y-2.5">
                {rightBenches.map((bench) => renderBenchCard(bench, 'right'))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side Benches */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300 flex items-center gap-1.5">
                <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Left Side Benches ({leftBenches.length})
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Benches 1 &rarr; {leftBenches.length}</span>
            </div>

            <div className="space-y-2.5">
              {leftBenches.map((bench) => renderBenchCard(bench, 'left'))}
            </div>
          </div>

          {/* Right Side Benches */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#1E2A5E] dark:text-indigo-300 flex items-center gap-1.5">
                <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Right Side Benches ({rightBenches.length})
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Benches 1 &rarr; {rightBenches.length}</span>
            </div>

            <div className="space-y-2.5">
              {rightBenches.map((bench) => renderBenchCard(bench, 'right'))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
