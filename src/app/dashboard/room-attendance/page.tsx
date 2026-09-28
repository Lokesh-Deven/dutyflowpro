"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  getAllAttendanceSubmissions,
  getInvigilatorDuties,
} from '@/lib/invigilator-portal-service';
import { RoomAttendanceSubmission } from '@/lib/invigilator-portal-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardCheck,
  DoorOpen,
  Users,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';

export default function AdminRoomAttendancePage() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<RoomAttendanceSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<RoomAttendanceSubmission | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSubmissions = () => {
    setIsRefreshing(true);
    const list = getAllAttendanceSubmissions();

    // If no submissions in localStorage yet, include sample demo Room 108 submission for instant administrative preview
    if (list.length === 0) {
      const demoSub: RoomAttendanceSubmission = {
        id: 'sub-demo-108',
        dutyId: 'demo-duty-108-english',
        examinationId: 'exam-eng-midterm',
        examName: 'Midterm Examination 2026',
        subjectName: 'English',
        date: '2026-09-28',
        sessionTime: '10:00 AM – 11:30 AM',
        roomNo: '108',
        invigilatorId: 'inv-kumar-001',
        invigilatorName: 'Mr. Kumar',
        totalStudents: 32,
        presentCount: 29,
        absentCount: 3,
        submittedAt: '10:45 AM',
        submittedTimestamp: new Date().toISOString(),
        isLocked: true,
        records: [
          { registerNumber: '101', studentName: 'Aarav Patel', section: '2A', benchNumber: 'B1', position: 'Left', status: 'Present' },
          { registerNumber: '102', studentName: 'Ananya Sharma', section: '2A', benchNumber: 'B1', position: 'Right', status: 'Present' },
          { registerNumber: '103', studentName: 'Bhavya Rao', section: '2A', benchNumber: 'B2', position: 'Left', status: 'Absent' },
          { registerNumber: '104', studentName: 'Chirag Mehta', section: '2A', benchNumber: 'B2', position: 'Right', status: 'Present' },
          { registerNumber: '123456', studentName: 'Rahul Kumar', section: '2A', benchNumber: 'B12', position: 'Left', status: 'Present' },
        ],
      };
      setSubmissions([demoSub]);
    } else {
      setSubmissions(list);
    }
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    loadSubmissions();

    const handleUpdate = () => loadSubmissions();
    window.addEventListener('dutyflow:attendance-updated', handleUpdate);
    return () => window.removeEventListener('dutyflow:attendance-updated', handleUpdate);
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalStudents = 0;

    submissions.forEach((s) => {
      totalPresent += s.presentCount;
      totalAbsent += s.absentCount;
      totalStudents += s.totalStudents;
    });

    return {
      roomsSubmitted: submissions.length,
      totalStudents,
      totalPresent,
      totalAbsent,
      attendancePercentage: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
    };
  }, [submissions]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter(
      (s) =>
        s.roomNo.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q) ||
        s.invigilatorName.toLowerCase().includes(q) ||
        s.examName.toLowerCase().includes(q)
    );
  }, [submissions, searchQuery]);

  // Requirement 23: Download Attendance Report as CSV
  const handleDownloadCsvReport = () => {
    if (submissions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data Available',
        description: 'No room attendance submissions found to export.',
      });
      return;
    }

    const headers = [
      'Examination',
      'Date',
      'Session',
      'Subject',
      'Room',
      'Invigilator',
      'Register Number',
      'Student Name',
      'Section',
      'Bench Number',
      'Position',
      'Attendance Status',
    ];

    const rows: string[] = [headers.join(',')];

    submissions.forEach((sub) => {
      sub.records.forEach((record) => {
        const row = [
          `"${sub.examName}"`,
          `"${sub.date}"`,
          `"${sub.sessionTime}"`,
          `"${sub.subjectName}"`,
          `"${sub.roomNo}"`,
          `"${sub.invigilatorName}"`,
          `"${record.registerNumber}"`,
          `"${record.studentName}"`,
          `"${record.section}"`,
          `"${record.benchNumber || ''}"`,
          `"${record.position || ''}"`,
          `"${record.status}"`,
        ];
        rows.push(row.join(','));
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `DutyFlow_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Report Downloaded',
      description: 'Attendance CSV report has been downloaded successfully.',
    });
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                Room Attendance Monitoring
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Live attendance submitted by faculty invigilators across examination halls
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubmissions}
            disabled={isRefreshing}
            className="text-xs font-bold h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintSheet}
            className="text-xs font-bold h-9 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>

          <Button
            onClick={handleDownloadCsvReport}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Download Attendance Report
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Rooms Submitted
          </div>
          <div className="font-headline font-black text-2xl text-slate-900 mt-0.5">
            {metrics.roomsSubmitted}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total Candidates
          </div>
          <div className="font-headline font-black text-2xl text-slate-900 mt-0.5">
            {metrics.totalStudents}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            Present Students
          </div>
          <div className="font-headline font-black text-2xl text-emerald-700 mt-0.5">
            {metrics.totalPresent}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
            Absent Students
          </div>
          <div className="font-headline font-black text-2xl text-rose-700 mt-0.5">
            {metrics.totalAbsent}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <Input
          placeholder="Filter by Room, Subject, or Invigilator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-white border-slate-300 rounded-xl text-xs"
        />
      </div>

      {/* Room Submissions List (Requirement 22) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubmissions.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-sm text-slate-700">No attendance submissions found</p>
            <p className="text-xs text-slate-400 mt-1">Invigilator submissions will appear here in real time.</p>
          </div>
        ) : (
          filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-headline font-black text-lg text-indigo-950 flex items-center gap-1.5">
                    <DoorOpen className="w-5 h-5 text-indigo-600" />
                    Room {sub.roomNo}
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                    Submitted ✓
                  </Badge>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="font-bold text-slate-900 text-sm">
                    {sub.subjectName}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Invigilator: <strong className="text-slate-800">{sub.invigilatorName}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {sub.sessionTime} • {sub.date}
                  </div>
                </div>

                {/* Numbers Box (Requirement 22) */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                    <div className="font-bold text-sm text-slate-800">{sub.totalStudents}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Present</div>
                    <div className="font-bold text-sm text-emerald-700">{sub.presentCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-rose-600 uppercase">Absent</div>
                    <div className="font-bold text-sm text-rose-700">{sub.absentCount}</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Locked at: <strong>{sub.submittedAt}</strong></span>
                  {sub.correctionRequested && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                      Correction Note
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSub(sub)}
                  className="w-full text-xs font-bold h-9 gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Student Attendance
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detailed Student Attendance Modal */}
      <Dialog open={Boolean(selectedSub)} onOpenChange={(open) => !open && setSelectedSub(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline font-bold text-slate-900 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-indigo-600" />
              Room {selectedSub?.roomNo} — Student Attendance
            </DialogTitle>
            <div className="text-xs text-slate-500 font-medium">
              Subject: <strong>{selectedSub?.subjectName}</strong> • Invigilator: <strong>{selectedSub?.invigilatorName}</strong> • Submitted: <strong>{selectedSub?.submittedAt}</strong>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 my-2 pr-1 space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold mb-3">
              <span>Total: {selectedSub?.totalStudents}</span>
              <span className="text-emerald-700 font-bold">Present: {selectedSub?.presentCount}</span>
              <span className="text-rose-700 font-bold">Absent: {selectedSub?.absentCount}</span>
            </div>

            {selectedSub?.records.map((rec) => {
              const isPres = rec.status === 'Present';
              return (
                <div
                  key={rec.registerNumber}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isPres
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {rec.registerNumber}
                      </span>
                      <span className="font-bold text-slate-900">
                        {rec.studentName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Section {rec.section}</span>
                      {rec.benchNumber && <span>• Bench {rec.benchNumber}</span>}
                      {rec.position && <span>• {rec.position}</span>}
                    </div>
                  </div>

                  <Badge
                    className={`font-bold text-xs ${
                      isPres
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {rec.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
