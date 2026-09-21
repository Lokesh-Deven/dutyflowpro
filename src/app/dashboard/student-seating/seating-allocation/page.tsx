"use client";

import React, { useState, useMemo } from 'react';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import {
  SeatingPattern,
  PositionSlot,
  SeatingMasterRoom,
  SeatingAllocationRecord,
  RoomSeatingPlan,
} from '@/lib/student-seating-types';
import { runDeterministicSeatingAllocation } from '@/lib/student-seating-engine';
import {
  generateRoomSeatingPlanPdf,
  generateStudentSeatingIndexPdf,
} from '@/lib/student-seating-pdf-service';
import { RoomSeatingDiagram } from '@/components/dashboard/student-seating/room-seating-diagram';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutGrid,
  Calendar,
  Clock,
  BookOpen,
  DoorOpen,
  Sparkles,
  CheckCircle2,
  FileText,
  Download,
  Eye,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Check,
  Printer,
} from 'lucide-react';

export default function SeatingAllocationWizardPage() {
  const {
    rooms: masterRooms,
    subjects,
    studentsBySubject,
    saveAllocation,
    activeAllocation,
    setActiveAllocation,
  } = useStudentSeating();

  const { activeAllotment, signatory, pdfPaletteId } = useAllotment();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const institutionName =
    (profile?.institution_name && profile.institution_name !== 'Guest Profile'
      ? profile.institution_name
      : null) ||
    (user?.user_metadata?.institution_name as string) ||
    'Institution Name';

  // Wizard Step State (1..6)
  const [currentStep, setCurrentStep] = useState<number>(activeAllocation ? 6 : 1);

  // Step 1: Examination Details
  const [selectedDutyExamId, setSelectedDutyExamId] = useState<string>('');
  const [examName, setExamName] = useState<string>('Midterm Examination - 2026');
  const [examDate, setExamDate] = useState<string>('2026-09-25');
  const [startTime, setStartTime] = useState<string>('09:00 AM');
  const [endTime, setEndTime] = useState<string>('12:00 PM');

  // Step 2: Selected Subjects
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Step 3: Seating Pattern
  const [pattern, setPattern] = useState<SeatingPattern>('3_PER_BENCH');

  // Step 4: Position Mapping (Slot -> Subject ID)
  const [positionMapping, setPositionMapping] = useState<Record<PositionSlot, string>>({
    SIDE_A: '',
    CENTER: '',
    SIDE_B: '',
  });

  // Step 5: Selected Rooms
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Step 6: Generated Plan & Active Modal
  const [viewingRoomPlan, setViewingRoomPlan] = useState<RoomSeatingPlan | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Calculate total students selected
  const totalStudentsSelected = useMemo(() => {
    return selectedSubjectIds.reduce((sum, sId) => {
      const list = studentsBySubject[sId] || [];
      return sum + list.length;
    }, 0);
  }, [selectedSubjectIds, studentsBySubject]);

  // Selected rooms capacity
  const selectedRoomsCapacity = useMemo(() => {
    return selectedRoomIds.reduce((sum, rId) => {
      const r = masterRooms.find((rm) => rm.id === rId);
      if (!r) return sum;
      const cap =
        pattern === '1_PER_BENCH'
          ? r.capacityOne
          : pattern === '2_PER_BENCH'
          ? r.capacityTwo
          : r.capacityThree;
      return sum + cap;
    }, 0);
  }, [selectedRoomIds, masterRooms, pattern]);

  const isCapacitySufficient = selectedRoomsCapacity >= totalStudentsSelected && totalStudentsSelected > 0;

  // Handle Examination select from DutyFlow
  const handleSelectDutyExam = (examId: string) => {
    setSelectedDutyExamId(examId);
    const exam = activeAllotment?.examinations?.find((e) => e.id === examId);
    if (exam) {
      setExamName(exam.examName || activeAllotment?.name || 'Examination');
      const d = new Date(exam.date);
      setExamDate(d.toISOString().split('T')[0]);
      setStartTime(exam.startTime || '09:00 AM');
      setEndTime(exam.endTime || '12:00 PM');
    }
  };

  // Run Allocation
  const handleGenerateAllocation = () => {
    if (!isCapacitySufficient) {
      toast({
        variant: "destructive",
        title: "Insufficient Capacity",
        description: `Selected rooms hold ${selectedRoomsCapacity} seats, but ${totalStudentsSelected} students are required.`,
      });
      return;
    }

    const selectedRooms = masterRooms.filter((r) => selectedRoomIds.includes(r.id));
    const selectedSubjs = subjects.filter((s) => selectedSubjectIds.includes(s.id));

    const result = runDeterministicSeatingAllocation({
      rooms: selectedRooms,
      subjects: selectedSubjs,
      studentsBySubject,
      pattern,
      positionMapping,
    });

    const newRecord: SeatingAllocationRecord = {
      id: activeAllocation ? activeAllocation.id : `alloc-${Date.now()}`,
      name: `${examName} - Seating Plan`,
      examination: {
        examId: selectedDutyExamId || undefined,
        examName,
        date: examDate,
        startTime,
        endTime,
      },
      subjectIds: selectedSubjectIds,
      pattern,
      positionMapping,
      roomIds: selectedRoomIds,
      roomPlans: result.roomPlans,
      subjectStats: result.subjectStats,
      summary: result.summary,
      status: 'Draft',
      createdAt: activeAllocation ? activeAllocation.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAllocation(newRecord);
    setActiveAllocation(newRecord);
    setCurrentStep(6);

    toast({
      title: "Allocation Generated",
      description: `Successfully allocated ${result.summary.allocatedStudents} students across ${result.summary.totalRooms} rooms.`,
    });
  };

  // PDF Export Handlers
  const handleDownloadAllRoomsPdf = async () => {
    if (!activeAllocation) return;
    setIsDownloadingPdf(true);
    try {
      await generateRoomSeatingPlanPdf({
        allocation: activeAllocation,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "PDF Downloaded",
        description: "Room-wise seating plans downloaded successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "PDF Export Failed",
        description: err.message || "Failed to generate room seating PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadSingleRoomPdf = async (plan: RoomSeatingPlan) => {
    if (!activeAllocation) return;
    setIsDownloadingPdf(true);
    try {
      await generateRoomSeatingPlanPdf({
        allocation: activeAllocation,
        roomPlan: plan,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "Room PDF Downloaded",
        description: `Seating plan for Room ${plan.roomNo} downloaded.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "PDF Export Failed",
        description: err.message || "Failed to generate single room PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadIndexPdf = async () => {
    if (!activeAllocation) return;
    setIsDownloadingPdf(true);
    try {
      await generateStudentSeatingIndexPdf({
        allocation: activeAllocation,
        institutionName,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: "Student Index PDF Downloaded",
        description: "Roll-call student seating index generated successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to generate Student Index PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Wizard Step Items
  const steps = [
    { num: 1, title: 'Exam Details' },
    { num: 2, title: 'Subjects' },
    { num: 3, title: 'Pattern' },
    { num: 4, title: 'Positions' },
    { num: 5, title: 'Rooms' },
    { num: 6, title: 'Summary & PDF' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Seating Allocation
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Deterministic, rule-based student seat assignment and room diagram generator.
              </p>
            </div>
          </div>
        </div>

        {currentStep === 6 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveAllocation(null);
              setCurrentStep(1);
            }}
            className="text-xs h-9 gap-1.5 font-bold text-[#1E2A5E]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Allocation
          </Button>
        )}
      </div>

      {/* Step Progress Indicator Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[620px] px-2">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => {
                    if (isCompleted || (activeAllocation && currentStep === 6)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 cursor-pointer transition-all ${
                    isCurrent
                      ? "text-[#1E2A5E] font-black"
                      : isCompleted
                      ? "text-emerald-700 font-bold"
                      : "text-slate-400 font-medium"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                      isCurrent
                        ? "bg-[#1E2A5E] text-white shadow-xs"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-800 font-bold"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="text-xs tracking-tight whitespace-nowrap">{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
                      isCompleted ? "bg-emerald-300" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — EXAMINATION DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800">
              Step 1: Examination Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an existing examination session from your DutyFlow schedule or enter examination info.
            </p>
          </div>

          {/* Quick select from active Master Allotment if available */}
          {activeAllotment?.examinations && activeAllotment.examinations.length > 0 && (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-2">
              <Label className="text-xs font-bold text-[#1E2A5E]">
                Auto-fill from Master Allotment Sessions:
              </Label>
              <Select value={selectedDutyExamId} onValueChange={handleSelectDutyExam}>
                <SelectTrigger className="bg-white text-xs font-semibold h-9">
                  <SelectValue placeholder="Select examination from active Master Allotment" />
                </SelectTrigger>
                <SelectContent>
                  {activeAllotment.examinations.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id} className="text-xs">
                      {ex.subject} &bull; {new Date(ex.date).toLocaleDateString()} ({ex.startTime} - {ex.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exam-name" className="text-xs font-bold text-slate-700">
                Examination Title
              </Label>
              <Input
                id="exam-name"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. First Internal Assessment - September 2026"
                className="text-xs font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exam-date" className="text-xs font-bold text-slate-700">
                  Date
                </Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-start" className="text-xs font-bold text-slate-700">
                  Start Time
                </Label>
                <Input
                  id="exam-start"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="09:00 AM"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exam-end" className="text-xs font-bold text-slate-700">
                  End Time
                </Label>
                <Input
                  id="exam-end"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="12:00 PM"
                  className="text-xs"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!examName.trim() || !examDate}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Select Subjects
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 — SELECT SUBJECTS */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800">
              Step 2: Select Examination Subjects
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one or multiple subjects scheduled for this examination session.
            </p>
          </div>

          <div className="space-y-2.5">
            {subjects.map((subj) => {
              const students = studentsBySubject[subj.id] || [];
              const isChecked = selectedSubjectIds.includes(subj.id);

              return (
                <div
                  key={subj.id}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedSubjectIds((prev) => prev.filter((id) => id !== subj.id));
                    } else {
                      setSelectedSubjectIds((prev) => [...prev, subj.id]);
                    }
                  }}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? "border-indigo-500 bg-indigo-50/50 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => {}}
                      className="data-[state=checked]:bg-[#1E2A5E]"
                    />
                    <div>
                      <div className="font-headline font-bold text-xs text-slate-900">
                        {subj.name}
                      </div>
                      {subj.code && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Code: {subj.code}
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`font-semibold text-xs px-2.5 py-0.5 ${
                      students.length > 0
                        ? "bg-white text-indigo-700 border-indigo-200"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    {students.length} Students
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Dynamic Selection Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Total Students Selected
              </div>
              <div className="font-headline font-black text-2xl text-slate-900 mt-0.5">
                {totalStudentsSelected}
              </div>
            </div>
            <Badge variant="outline" className="bg-white text-xs font-semibold py-1 px-3 border-slate-200">
              {selectedSubjectIds.length} Subject(s) Chosen
            </Badge>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="text-xs h-9 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={() => setCurrentStep(3)}
              disabled={selectedSubjectIds.length === 0 || totalStudentsSelected === 0}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Seating Pattern
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — SELECT SEATING PATTERN */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800">
              Step 3: Select Seating Pattern
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose how many students sit on each examination bench.
            </p>
          </div>

          {/* 3 Selectable Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Option 1: 1 / Bench */}
            <div
              onClick={() => setPattern('1_PER_BENCH')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                pattern === '1_PER_BENCH'
                  ? "border-[#1E2A5E] bg-indigo-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700 mb-2">
                  Option 1
                </Badge>
                <div className="font-headline font-black text-sm text-slate-900">
                  1 Student / Bench
                </div>
                <div className="text-[11px] font-semibold text-indigo-700 mt-1">
                  Position: CENTER
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Capacity</span>
                <span className="font-headline font-black text-base text-slate-800">
                  20 students
                </span>
                <span className="text-[9px] text-slate-400 block">for 20-bench room</span>
              </div>
            </div>

            {/* Option 2: 2 / Bench */}
            <div
              onClick={() => setPattern('2_PER_BENCH')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                pattern === '2_PER_BENCH'
                  ? "border-[#1E2A5E] bg-indigo-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700 mb-2">
                  Option 2
                </Badge>
                <div className="font-headline font-black text-sm text-slate-900">
                  2 Students / Bench
                </div>
                <div className="text-[11px] font-semibold text-purple-700 mt-1">
                  SIDE A + SIDE B
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Capacity</span>
                <span className="font-headline font-black text-base text-slate-800">
                  40 students
                </span>
                <span className="text-[9px] text-slate-400 block">for 20-bench room</span>
              </div>
            </div>

            {/* Option 3: 3 / Bench */}
            <div
              onClick={() => setPattern('3_PER_BENCH')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                pattern === '3_PER_BENCH'
                  ? "border-[#1E2A5E] bg-indigo-50/40 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700 mb-2">
                  Option 3
                </Badge>
                <div className="font-headline font-black text-sm text-slate-900">
                  3 Students / Bench
                </div>
                <div className="text-[11px] font-semibold text-blue-700 mt-1">
                  SIDE A + CENTER + SIDE B
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Capacity</span>
                <span className="font-headline font-black text-base text-slate-800">
                  60 students
                </span>
                <span className="text-[9px] text-slate-400 block">for 20-bench room</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(2)}
              className="text-xs h-9 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={() => setCurrentStep(4)}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Assign Positions
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4 — ASSIGN SUBJECTS TO POSITIONS */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-headline font-bold text-lg text-slate-800">
              Step 4: Assign Subjects to Bench Positions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify which subject occupies each physical seat slot on the bench.
            </p>
          </div>

          <div className="space-y-4">
            {pattern === '1_PER_BENCH' && (
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                <Label className="text-xs font-bold text-slate-800">
                  CENTER &rarr; Select Subject
                </Label>
                <Select
                  value={positionMapping.CENTER || selectedSubjectIds[0] || ""}
                  onValueChange={(val) =>
                    setPositionMapping((prev) => ({ ...prev, CENTER: val }))
                  }
                >
                  <SelectTrigger className="bg-white text-xs font-semibold h-9">
                    <SelectValue placeholder="Select Subject for Center Position" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSubjectIds.map((id) => {
                      const s = subjects.find((sb) => sb.id === id);
                      return (
                        <SelectItem key={id} value={id} className="text-xs">
                          {s?.name} ({studentsBySubject[id]?.length || 0} students)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pattern === '2_PER_BENCH' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    SIDE A &rarr; Select Subject
                  </Label>
                  <Select
                    value={positionMapping.SIDE_A || selectedSubjectIds[0] || ""}
                    onValueChange={(val) =>
                      setPositionMapping((prev) => ({ ...prev, SIDE_A: val }))
                    }
                  >
                    <SelectTrigger className="bg-white text-xs font-semibold h-9">
                      <SelectValue placeholder="Select Subject for Side A" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubjectIds.map((id) => {
                        const s = subjects.find((sb) => sb.id === id);
                        return (
                          <SelectItem key={id} value={id} className="text-xs">
                            {s?.name} ({studentsBySubject[id]?.length || 0} students)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    SIDE B &rarr; Select Subject
                  </Label>
                  <Select
                    value={positionMapping.SIDE_B || selectedSubjectIds[1] || selectedSubjectIds[0] || ""}
                    onValueChange={(val) =>
                      setPositionMapping((prev) => ({ ...prev, SIDE_B: val }))
                    }
                  >
                    <SelectTrigger className="bg-white text-xs font-semibold h-9">
                      <SelectValue placeholder="Select Subject for Side B" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubjectIds.map((id) => {
                        const s = subjects.find((sb) => sb.id === id);
                        return (
                          <SelectItem key={id} value={id} className="text-xs">
                            {s?.name} ({studentsBySubject[id]?.length || 0} students)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {pattern === '3_PER_BENCH' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    SIDE A &rarr; Subject
                  </Label>
                  <Select
                    value={positionMapping.SIDE_A || selectedSubjectIds[0] || ""}
                    onValueChange={(val) =>
                      setPositionMapping((prev) => ({ ...prev, SIDE_A: val }))
                    }
                  >
                    <SelectTrigger className="bg-white text-xs font-semibold h-9">
                      <SelectValue placeholder="Side A" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubjectIds.map((id) => {
                        const s = subjects.find((sb) => sb.id === id);
                        return (
                          <SelectItem key={id} value={id} className="text-xs">
                            {s?.name} ({studentsBySubject[id]?.length || 0})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    CENTER &rarr; Subject
                  </Label>
                  <Select
                    value={positionMapping.CENTER || selectedSubjectIds[1] || selectedSubjectIds[0] || ""}
                    onValueChange={(val) =>
                      setPositionMapping((prev) => ({ ...prev, CENTER: val }))
                    }
                  >
                    <SelectTrigger className="bg-white text-xs font-semibold h-9">
                      <SelectValue placeholder="Center" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubjectIds.map((id) => {
                        const s = subjects.find((sb) => sb.id === id);
                        return (
                          <SelectItem key={id} value={id} className="text-xs">
                            {s?.name} ({studentsBySubject[id]?.length || 0})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    SIDE B &rarr; Subject
                  </Label>
                  <Select
                    value={positionMapping.SIDE_B || selectedSubjectIds[0] || ""}
                    onValueChange={(val) =>
                      setPositionMapping((prev) => ({ ...prev, SIDE_B: val }))
                    }
                  >
                    <SelectTrigger className="bg-white text-xs font-semibold h-9">
                      <SelectValue placeholder="Side B" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSubjectIds.map((id) => {
                        const s = subjects.find((sb) => sb.id === id);
                        return (
                          <SelectItem key={id} value={id} className="text-xs">
                            {s?.name} ({studentsBySubject[id]?.length || 0})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(3)}
              className="text-xs h-9 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={() => {
                // Ensure default position fallback if untouched
                const updated = { ...positionMapping };
                if (pattern === '1_PER_BENCH' && !updated.CENTER) {
                  updated.CENTER = selectedSubjectIds[0];
                }
                if (pattern === '2_PER_BENCH') {
                  if (!updated.SIDE_A) updated.SIDE_A = selectedSubjectIds[0];
                  if (!updated.SIDE_B) updated.SIDE_B = selectedSubjectIds[1] || selectedSubjectIds[0];
                }
                if (pattern === '3_PER_BENCH') {
                  if (!updated.SIDE_A) updated.SIDE_A = selectedSubjectIds[0];
                  if (!updated.CENTER) updated.CENTER = selectedSubjectIds[1] || selectedSubjectIds[0];
                  if (!updated.SIDE_B) updated.SIDE_B = selectedSubjectIds[0];
                }
                setPositionMapping(updated);
                setCurrentStep(5);
              }}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5 gap-1.5 shadow-xs"
            >
              Continue to Select Rooms
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5 — ROOM SELECTION */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-4xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline font-bold text-lg text-slate-800">
                Step 5: Select Examination Rooms
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select Master Rooms to accommodate {totalStudentsSelected} students ({pattern.replace('_', ' ')}).
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Quick auto select enough rooms
                let needed = totalStudentsSelected;
                const picked: string[] = [];
                for (const r of masterRooms) {
                  if (needed <= 0) break;
                  const cap = pattern === '1_PER_BENCH' ? r.capacityOne : pattern === '2_PER_BENCH' ? r.capacityTwo : r.capacityThree;
                  picked.push(r.id);
                  needed -= cap;
                }
                setSelectedRoomIds(picked);
              }}
              className="text-xs h-8 text-[#1E2A5E] font-bold"
            >
              Auto-Select Needed Rooms
            </Button>
          </div>

          {/* Rooms Table / Cards */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center w-10">Select</th>
                  <th className="py-3 px-4">Room No.</th>
                  <th className="py-3 px-3 text-center">Benches</th>
                  <th className="py-3 px-3 text-center font-bold text-[#1E2A5E]">
                    Current Capacity ({pattern === '1_PER_BENCH' ? '1/Bench' : pattern === '2_PER_BENCH' ? '2/Bench' : '3/Bench'})
                  </th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {masterRooms.map((room) => {
                  const isChecked = selectedRoomIds.includes(room.id);
                  const effectiveCap =
                    pattern === '1_PER_BENCH'
                      ? room.capacityOne
                      : pattern === '2_PER_BENCH'
                      ? room.capacityTwo
                      : room.capacityThree;

                  return (
                    <tr
                      key={room.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id));
                        } else {
                          setSelectedRoomIds((prev) => [...prev, room.id]);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? "bg-indigo-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {}}
                          className="data-[state=checked]:bg-[#1E2A5E]"
                        />
                      </td>
                      <td className="py-3 px-4 font-headline font-black text-xs text-slate-900">
                        {room.roomNo}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {room.totalBenches} ({room.leftBenches}L + {room.rightBenches}R)
                      </td>
                      <td className="py-3 px-3 text-center font-headline font-black text-xs text-indigo-700">
                        {effectiveCap} seats
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">
                          Available
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dynamic Real-Time Capacity Audit Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isCapacitySufficient
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-rose-50/80 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-3">
              {isCapacitySufficient ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="font-headline font-bold text-xs uppercase tracking-wider">
                  {isCapacitySufficient
                    ? "Capacity Sufficient & Ready for Allocation"
                    : "Insufficient Capacity Selected"}
                </div>
                <div className="text-xs mt-0.5 font-medium opacity-90">
                  Required: <strong>{totalStudentsSelected}</strong> &bull; Selected Room Capacity:{" "}
                  <strong>{selectedRoomsCapacity}</strong> &bull; Vacant Buffer:{" "}
                  <strong>{Math.max(0, selectedRoomsCapacity - totalStudentsSelected)}</strong>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-xs py-1 px-3 font-bold ${
                isCapacitySufficient
                  ? "bg-white text-emerald-700 border-emerald-300"
                  : "bg-white text-rose-700 border-rose-300"
              }`}
            >
              {isCapacitySufficient ? "✓ Ready" : "⚠ Shortage"}
            </Badge>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(4)}
              className="text-xs h-9 gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <Button
              onClick={handleGenerateAllocation}
              disabled={!isCapacitySufficient}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-6 gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              Generate Seating Allocation
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6 — ALLOCATION SUMMARY & VISUAL ROOM DIAGRAM */}
      {currentStep === 6 && activeAllocation && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total Students
              </div>
              <div className="font-headline font-black text-2xl text-slate-900 mt-1">
                {activeAllocation.summary.totalStudents}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Selected Rooms
              </div>
              <div className="font-headline font-black text-2xl text-indigo-700 mt-1">
                {activeAllocation.summary.totalRooms}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total Capacity
              </div>
              <div className="font-headline font-black text-2xl text-purple-700 mt-1">
                {activeAllocation.summary.totalCapacity}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Allocated
              </div>
              <div className="font-headline font-black text-2xl text-emerald-600 mt-1">
                {activeAllocation.summary.allocatedStudents}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Vacant Seats
              </div>
              <div className="font-headline font-black text-2xl text-amber-600 mt-1">
                {activeAllocation.summary.vacantSeats}
              </div>
            </div>
          </div>

          {/* Global Action Bar for PDFs */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-headline font-bold text-sm text-slate-900">
                {activeAllocation.name}
              </h3>
              <p className="text-xs text-slate-500">
                Date: {activeAllocation.examination.date} &bull; Time: {activeAllocation.examination.startTime} – {activeAllocation.examination.endTime}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadIndexPdf}
                disabled={isDownloadingPdf}
                className="h-9 text-xs font-bold px-3 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Student Index PDF
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadAllRoomsPdf}
                disabled={isDownloadingPdf}
                className="h-9 text-xs font-bold px-4 gap-1.5 bg-[#1E2A5E] hover:bg-[#151D42] text-white shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download All Room PDFs
              </Button>
            </div>
          </div>

          {/* Subject-Wise Allocation Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 font-headline font-bold text-xs uppercase tracking-wider text-slate-700">
              Subject-Wise Allocation
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-3 text-center">Total Students</th>
                  <th className="py-2.5 px-3 text-center">Allocated</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activeAllocation.subjectStats.map((stat) => (
                  <tr key={stat.subjectId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{stat.subjectName}</td>
                    <td className="py-2.5 px-3 text-center">{stat.totalStudents}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-700">{stat.allocatedCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          stat.status === 'Complete'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                            : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                        }
                      >
                        {stat.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Room-Wise Allocation Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 font-headline font-bold text-xs uppercase tracking-wider text-slate-700">
              Room-Wise Allocation ({activeAllocation.roomPlans.length} Rooms)
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Room No.</th>
                  <th className="py-2.5 px-3 text-center">Capacity</th>
                  <th className="py-2.5 px-3 text-center">Allocated</th>
                  <th className="py-2.5 px-3 text-center">Vacant</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activeAllocation.roomPlans.map((plan) => (
                  <tr key={plan.roomId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-headline font-black text-xs text-slate-900">
                      Room {plan.roomNo}
                    </td>
                    <td className="py-2.5 px-3 text-center">{plan.capacity}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{plan.allocatedCount}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{plan.vacantCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          plan.status === 'Full'
                            ? "bg-purple-50 text-purple-700 border-purple-200 text-[10px]"
                            : "bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                        }
                      >
                        {plan.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingRoomPlan(plan)}
                          className="h-7 text-[11px] font-bold px-2.5 gap-1 text-[#1E2A5E]"
                        >
                          <Eye className="w-3 h-3" />
                          View Seating Plan
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadSingleRoomPdf(plan)}
                          disabled={isDownloadingPdf}
                          className="h-7 text-[11px] font-semibold px-2 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual Seating Plan Modal */}
          <Dialog
            open={Boolean(viewingRoomPlan)}
            onOpenChange={(open) => {
              if (!open) setViewingRoomPlan(null);
            }}
          >
            <DialogContent className="max-w-5xl bg-slate-50 border border-slate-200 max-h-[92vh] overflow-y-auto p-6">
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="font-headline text-lg font-bold text-slate-900">
                    Room No. {viewingRoomPlan?.roomNo} &bull; Visual Seating Plan
                  </DialogTitle>
                </div>
              </DialogHeader>

              {viewingRoomPlan && (
                <RoomSeatingDiagram
                  plan={viewingRoomPlan}
                  examName={activeAllocation.examination.examName}
                  examDate={activeAllocation.examination.date}
                  examTime={`${activeAllocation.examination.startTime} – ${activeAllocation.examination.endTime}`}
                />
              )}

              <DialogFooter className="pt-2">
                {viewingRoomPlan && (
                  <Button
                    type="button"
                    onClick={() => handleDownloadSingleRoomPdf(viewingRoomPlan)}
                    disabled={isDownloadingPdf}
                    className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 mr-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download This Room PDF
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingRoomPlan(null)}
                  className="text-xs h-9"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
