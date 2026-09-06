"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Invigilator, Examination, AllotmentResult, SavedAllotment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Save, FileSpreadsheet, Building2, GraduationCap, CalendarCheck, CheckCircle2, AlertTriangle, Users, BookOpen, ChevronLeft, ChevronRight, RefreshCw, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatAppDate, formatAppDateWithDay, parseAppDate } from '@/lib/date-utils';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { uploadUserFile } from '@/lib/storage-service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn, formatTimeTo12Hour } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SubscriptionDialog } from '@/components/dashboard/subscription-dialog';

type AllotmentSheetProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
  onAllotmentChange: (newResult: AllotmentResult) => void;
};

export function AllotmentSheet({ invigilators, examinations, allotmentResult: initialAllotmentResult, onAllotmentChange }: AllotmentSheetProps) {
  const { toast } = useToast();
  const { activeAllotment, saveCurrentAllotment, savedAllotments } = useAllotment();
  const { user, profile, canDownload, recordCategoryDownload } = useAuth();
  const [allotmentResult, setAllotmentResult] = useState<AllotmentResult>(initialAllotmentResult);
  const [isSaveAlertOpen, setIsSaveAlertOpen] = useState(false);
  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<SavedAllotment | null>(null);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);

  // Table horizontal scrolling & floating navigator state
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [arrowPositions, setArrowPositions] = useState<{
    leftX: number;
    rightX: number;
    isVisible: boolean;
  }>({ leftX: 0, rightX: 0, isVisible: false });

  // Auto-scroll interval and hold timer references
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const updateArrowPositions = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Check if table is currently intersecting the screen
    const isVerticallyInView = rect.bottom > 120 && rect.top < windowHeight - 120;

    setArrowPositions({
      leftX: rect.left,
      rightX: rect.right,
      isVisible: isVerticallyInView,
    });
  }, []);

  useEffect(() => {
    checkScroll();
    updateArrowPositions();
    const timer = setTimeout(() => {
      checkScroll();
      updateArrowPositions();
    }, 120);

    const handleScrollOrResize = () => {
      updateArrowPositions();
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (tableContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
        updateArrowPositions();
      });
      resizeObserver.observe(tableContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [checkScroll, updateArrowPositions, examinations]);

  const stopContinuousScroll = useCallback(() => {
    if (scrollHoldTimerRef.current) {
      clearTimeout(scrollHoldTimerRef.current);
      scrollHoldTimerRef.current = null;
    }
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((direction: 'left' | 'right', e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Only primary button
    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }

    const container = tableContainerRef.current;
    if (!container) return;

    stopContinuousScroll();

    // 1. Immediate step scroll on click/press
    const stepAmount = direction === 'left' ? -300 : 300;
    container.scrollBy({ left: stepAmount, behavior: 'smooth' });

    // 2. If held down for > 250ms, start continuous auto-scrolling
    scrollHoldTimerRef.current = setTimeout(() => {
      const scrollSpeed = direction === 'left' ? -16 : 16;
      scrollIntervalRef.current = setInterval(() => {
        const el = tableContainerRef.current;
        if (!el) {
          stopContinuousScroll();
          return;
        }

        el.scrollLeft += scrollSpeed;

        // Automatically stop when boundaries are reached
        if (direction === 'left' && el.scrollLeft <= 0) {
          stopContinuousScroll();
        } else if (direction === 'right' && el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          stopContinuousScroll();
        }
      }, 16);
    }, 250);
  }, [stopContinuousScroll]);

  const handlePointerUp = useCallback((e?: React.PointerEvent<HTMLButtonElement>) => {
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
    }
    stopContinuousScroll();
  }, [stopContinuousScroll]);

  useEffect(() => {
    return () => {
      stopContinuousScroll();
    };
  }, [stopContinuousScroll]);

  const scrollTable = (direction: 'left' | 'right') => {
    const container = tableContainerRef.current;
    if (!container) return;
    const scrollAmount = direction === 'left' ? -420 : 420;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const defaultSaveName = useMemo(() => {
    return activeAllotment?.name || (examinations.length > 0 ? examinations[0].examName : 'New Allotment');
  }, [activeAllotment, examinations]);

  const [saveName, setSaveName] = useState(defaultSaveName);

  const uniqueDates = useMemo(() => {
    const dates = examinations.map(exam => format(new Date(exam.date), 'yyyy-MM-dd'));
    return [...new Set(dates)].sort();
  }, [examinations]);

  const dateColorMap = useMemo(() => {
    const colors = [
      'bg-gradient-to-b from-indigo-100 to-indigo-200/90 text-indigo-700 border border-indigo-300/80 dark:from-indigo-950/70 dark:to-indigo-900/60 dark:text-indigo-300 dark:border-indigo-700/60',
      'bg-gradient-to-b from-cyan-100 to-cyan-200/90 text-cyan-800 border border-cyan-300/80 dark:from-cyan-950/70 dark:to-cyan-900/60 dark:text-cyan-300 dark:border-cyan-700/60',
      'bg-gradient-to-b from-amber-100 to-amber-200/90 text-amber-900 border border-amber-300/80 dark:from-amber-950/70 dark:to-amber-900/60 dark:text-amber-300 dark:border-amber-700/60',
      'bg-gradient-to-b from-emerald-100 to-emerald-200/90 text-emerald-800 border border-emerald-300/80 dark:from-emerald-950/70 dark:to-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700/60',
      'bg-gradient-to-b from-purple-100 to-purple-200/90 text-purple-800 border border-purple-300/80 dark:from-purple-950/70 dark:to-purple-900/60 dark:text-purple-300 dark:border-purple-700/60',
      'bg-gradient-to-b from-rose-100 to-rose-200/90 text-rose-800 border border-rose-300/80 dark:from-rose-950/70 dark:to-rose-900/60 dark:text-rose-300 dark:border-rose-700/60',
      'bg-gradient-to-b from-sky-100 to-sky-200/90 text-sky-800 border border-sky-300/80 dark:from-sky-950/70 dark:to-sky-900/60 dark:text-sky-300 dark:border-sky-700/60',
      'bg-gradient-to-b from-teal-100 to-teal-200/90 text-teal-800 border border-teal-300/80 dark:from-teal-950/70 dark:to-teal-900/60 dark:text-teal-300 dark:border-teal-700/60',
    ];
    return uniqueDates.reduce((acc, date, index) => {
      acc[date] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [uniqueDates]);

  useEffect(() => {
    setAllotmentResult(initialAllotmentResult);
  }, [initialAllotmentResult]);

  useEffect(() => {
    setSaveName(defaultSaveName);
  }, [defaultSaveName]);

  const handleDutyToggle = (invigilatorId: string, examId: string) => {
    const newResult = { ...allotmentResult };
    const newAssignments = { ...newResult.assignments };
    const currentDuties = newAssignments[invigilatorId] || [];

    const dutyIndex = currentDuties.indexOf(examId);

    if (dutyIndex > -1) {
      const updatedDuties = [...currentDuties];
      updatedDuties.splice(dutyIndex, 1);
      newAssignments[invigilatorId] = updatedDuties;
    } else {
      newAssignments[invigilatorId] = [...currentDuties, examId];
    }

    const updatedResult = { ...newResult, assignments: newAssignments };
    setAllotmentResult(updatedResult);
    onAllotmentChange(updatedResult);
  };

  const handleSave = () => {
    const trimmed = saveName.trim() || 'Untitled Allotment';

    // Check if an allotment with the same title already exists in Saved Allotments
    const existingSameTitle = savedAllotments.find(
      sa => sa.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (existingSameTitle) {
      setDuplicateTarget(existingSameTitle);
      setIsSaveAlertOpen(false);
      setIsDuplicateAlertOpen(true);
      return;
    }

    saveCurrentAllotment(trimmed, allotmentResult.assignments);
    setIsSaveAlertOpen(false);
    toast({
      title: "Allotment Saved",
      description: `"${trimmed}" has been saved successfully.`
    });
  };

  const handleReplaceAllotment = () => {
    if (!duplicateTarget) return;
    const trimmed = saveName.trim() || duplicateTarget.name;
    saveCurrentAllotment(trimmed, allotmentResult.assignments, {
      mode: 'replace',
      targetId: duplicateTarget.id,
    });
    setIsDuplicateAlertOpen(false);
    setDuplicateTarget(null);
    toast({
      title: "Allotment Replaced",
      description: `"${trimmed}" has been replaced successfully.`
    });
  };

  const handleSaveAsNewAllotment = () => {
    const trimmed = saveName.trim() || 'Untitled Allotment';
    saveCurrentAllotment(trimmed, allotmentResult.assignments, {
      mode: 'new',
    });
    setIsDuplicateAlertOpen(false);
    setDuplicateTarget(null);
    toast({
      title: "Allotment Saved as New",
      description: `"${trimmed}" has been saved as a new allotment.`
    });
  };

  const handleDownload = async () => {
    const check = canDownload('master_roster');
    if (!check.allowed) {
      setIsSubscriptionDialogOpen(true);
      return;
    }

    recordCategoryDownload('master_roster');
    toast({
      title: "Generating PDF...",
      description: "Your download will begin shortly.",
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
    const leftMargin = 12;
    const rightMargin = 12;
    const tableWidth = pageWidth - leftMargin - rightMargin; // 273 mm

    // 1. Top Navy Accent Stripe (centered across table width)
    const stripeY = 10;
    const stripeHeight = 2.2;
    doc.setFillColor(31, 58, 95); // Deep Navy #1F3A5F
    doc.rect(leftMargin, stripeY, tableWidth, stripeHeight, 'F');

    // 2. Institution Header Block (Centered)
    const examInfo = examinations.length > 0 ? examinations[0] : null;
    const rawCollegeName = examInfo?.college || profile?.institution_name || 'College Name';
    const collegeTitle = rawCollegeName.toUpperCase();
    const subtitle = examInfo?.examName || 'Midterm Examination - September, 2026';
    const footerInstitutionText = `${rawCollegeName} \u2022 ${subtitle}`;

    let currentY = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(31, 58, 95); // Deep Navy #1F3A5F
    doc.text(collegeTitle, pageWidth / 2, currentY, { align: 'center' });

    currentY += 5.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // Slate #475569
    doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });

    currentY += 5.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(31, 58, 95); // #1F3A5F
    doc.text("INVIGILATION DUTY ALLOTMENT SHEET", pageWidth / 2, currentY, { align: 'center' });

    // 4. Examination Schedule & Duty Overview Strip
    const sortedExams = [...examinations].sort((a, b) => {
      const da = parseAppDate(a.date)?.getTime() || 0;
      const db = parseAppDate(b.date)?.getTime() || 0;
      return da - db;
    });

    let scheduleRangeText = '';
    if (sortedExams.length > 0) {
      const firstDate = parseAppDate(sortedExams[0].date);
      const lastDate = parseAppDate(sortedExams[sortedExams.length - 1].date);
      if (firstDate && lastDate) {
        if (firstDate.getTime() === lastDate.getTime()) {
          scheduleRangeText = format(firstDate, 'd MMMM yyyy');
        } else if (firstDate.getMonth() === lastDate.getMonth() && firstDate.getFullYear() === lastDate.getFullYear()) {
          scheduleRangeText = `${format(firstDate, 'd')} \u2013 ${format(lastDate, 'd MMMM yyyy')}`;
        } else if (firstDate.getFullYear() === lastDate.getFullYear()) {
          scheduleRangeText = `${format(firstDate, 'd MMMM')} \u2013 ${format(lastDate, 'd MMMM yyyy')}`;
        } else {
          scheduleRangeText = `${format(firstDate, 'd MMMM yyyy')} \u2013 ${format(lastDate, 'd MMMM yyyy')}`;
        }
      } else {
        scheduleRangeText = `${formatAppDate(sortedExams[0].date)} \u2013 ${formatAppDate(sortedExams[sortedExams.length - 1].date)}`;
      }
    }

    currentY += 4.5;
    const stripY = currentY;
    const stripHeight = 6.2;
    doc.setFillColor(228, 236, 244); // #E4ECF4
    doc.rect(leftMargin, stripY, tableWidth, stripHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 58, 95); // #1F3A5F
    doc.text(
      scheduleRangeText ? `Examination Schedule \u2022 ${scheduleRangeText}` : 'Examination Schedule',
      leftMargin + 3.5,
      stripY + 4.2
    );
    doc.text('Duty Overview', leftMargin + tableWidth - 3.5, stripY + 4.2, { align: 'right' });

    // 5. Table Header Data
    const examHeaders = examinations.map(exam => {
      const d = parseAppDate(exam.date);
      const dateStr = d ? format(d, 'dd.MM') : formatAppDate(exam.date).slice(0, 5);
      return {
        id: exam.id,
        headerText: `${dateStr}\n${exam.subject}`,
        rooms: exam.rooms,
        relievers: exam.relievers,
      };
    });

    const head = [
      [
        'Sl.\nNo',
        "Invigilator's Name",
        'Designation',
        ...examHeaders.map(e => e.headerText),
        'Total'
      ]
    ];

    const body = invigilators.map((invigilator, index) => {
      const duties = allotmentResult.assignments[invigilator.id] || [];
      const dutyCount = duties.length;
      return [
        index + 1,
        invigilator.name,
        invigilator.designation,
        ...examinations.map(exam => {
          const hasDuty = duties.includes(exam.id);
          return hasDuty ? '1' : '0';
        }),
        dutyCount
      ];
    });

    const dutiesPerExam = examinations.map(exam => {
      return invigilators.reduce((count, invigilator) => {
        const duties = allotmentResult.assignments[invigilator.id] || [];
        return count + (duties.includes(exam.id) ? 1 : 0);
      }, 0);
    });
    const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
    const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
    const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
    const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

    // Column widths matching reference PDF proportions
    const slNoWidth = Math.max(9, Math.round(tableWidth * 0.036 * 10) / 10);
    const nameWidth = Math.max(34, Math.round(tableWidth * 0.144 * 10) / 10);
    const desigWidth = Math.max(34, Math.round(tableWidth * 0.149 * 10) / 10);
    const totalWidth = Math.max(12, Math.round(tableWidth * 0.056 * 10) / 10);

    const remainingWidth = tableWidth - slNoWidth - nameWidth - desigWidth - totalWidth;
    const examColWidth = examHeaders.length > 0 ? remainingWidth / examHeaders.length : 20;

    const columnStyles: Record<number, any> = {
      0: { halign: 'center', cellWidth: slNoWidth },
      1: { halign: 'left', cellWidth: nameWidth },
      2: { halign: 'left', cellWidth: desigWidth },
    };
    examHeaders.forEach((_, idx) => {
      columnStyles[3 + idx] = { halign: 'center', cellWidth: examColWidth };
    });
    columnStyles[3 + examHeaders.length] = { halign: 'center', cellWidth: totalWidth, fontStyle: 'bold' };

    const foot = [
      [
        { content: 'No. of Invigilators', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [255, 255, 255], cellPadding: { left: 3, top: 1.5, bottom: 1.5 } } },
        ...examinations.map(exam => ({ content: String(exam.rooms), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } })),
        { content: String(totalRooms), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } }
      ],
      [
        { content: 'No. of Relievers', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [255, 255, 255], cellPadding: { left: 3, top: 1.5, bottom: 1.5 } } },
        ...examinations.map(exam => ({ content: String(exam.relievers), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } })),
        { content: String(totalRelievers), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } }
      ],
      [
        { content: 'Total Invigilators', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [255, 255, 255], cellPadding: { left: 3, top: 1.5, bottom: 1.5 } } },
        ...examinations.map(exam => ({ content: String(exam.rooms + exam.relievers), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } })),
        { content: String(totalInvigilatorsRequired), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } }
      ],
      [
        { content: 'Total Duties Allotted', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [255, 255, 255], cellPadding: { left: 3, top: 1.5, bottom: 1.5 } } },
        ...dutiesPerExam.map(count => ({ content: String(count), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } })),
        { content: String(totalDutiesAllotted), styles: { halign: 'center', fontStyle: 'bold', textColor: [31, 58, 95], fillColor: [228, 236, 244], cellPadding: { top: 1.5, bottom: 1.5 } } }
      ],
    ];

    const tableStartY = stripY + stripHeight + 2.2;

    (doc as any).autoTable({
      head: head,
      body: body,
      foot: foot,
      startY: tableStartY,
      margin: { left: leftMargin, right: rightMargin, bottom: 12 },
      theme: 'grid',
      headStyles: {
        fillColor: [32, 59, 100], // #203B64 Navy
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 6.8,
        lineWidth: 0.15,
        lineColor: [205, 214, 225], // #CDD6E1
        cellPadding: { top: 1.8, bottom: 1.8, left: 1, right: 1 },
        minCellHeight: 10,
      },
      bodyStyles: {
        textColor: [30, 41, 59], // #1E293B
        fontSize: 7,
        valign: 'middle',
        lineWidth: 0.15,
        lineColor: [212, 221, 230], // #D4DDE6
        cellPadding: { top: 1.1, bottom: 1.1, left: 1.5, right: 1.5 },
        minCellHeight: 4.6,
      },
      alternateRowStyles: {
        fillColor: [238, 243, 248], // #EEF3F8
      },
      footStyles: {
        fontSize: 7,
        fontStyle: 'bold',
        textColor: [31, 58, 95],
        valign: 'middle',
        lineWidth: 0.15,
        lineColor: [205, 214, 225],
      },
      columnStyles: columnStyles,
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // #64748B
      doc.text(footerInstitutionText, leftMargin, pageHeight - 8);
      doc.text(`Preview \u2022 Page ${i} of ${totalPages}`, pageWidth - rightMargin, pageHeight - 8, { align: 'right' });
    }

    const fileName = `${saveName.replace(/ /g, '_')}.pdf`;
    const pdfBlob = doc.output('blob');
    doc.save(fileName);

    // Save generated PDF to Supabase Storage per user
    if (user?.id) {
      uploadUserFile({
        file: pdfBlob,
        fileName,
        fileType: 'pdf',
        category: 'download',
        subCategory: 'allotment_sheet',
        userId: user.id,
        metadata: {
          allotmentName: saveName,
          invigilatorCount: invigilators.length,
          examCount: examinations.length,
          totalDuties: totalDutiesAllotted,
        },
        mimeType: 'application/pdf',
      }).then(({ error }) => {
        if (!error) {
          toast({
            title: "Cloud Backup Complete",
            description: `"${fileName}" was saved to your Supabase cloud files.`,
          });
        }
      });
    }
  };

  const examInfo = examinations.length > 0 ? examinations[0] : null;
  const totalRooms = examinations.reduce((acc, exam) => acc + exam.rooms, 0);
  const totalRelievers = examinations.reduce((acc, exam) => acc + exam.relievers, 0);
  const totalInvigilatorsRequired = examinations.reduce((acc, exam) => acc + exam.rooms + exam.relievers, 0);
  const dutiesPerExam = examinations.map(exam => invigilators.reduce((count, invigilator) => count + ((allotmentResult.assignments[invigilator.id] || []).includes(exam.id) ? 1 : 0), 0));
  const totalDutiesAllotted = dutiesPerExam.reduce((sum, count) => sum + count, 0);

  return (
    <TooltipProvider>
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Top Accent Gradient Line */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#f59e0b]" />

        <CardHeader className="pb-5 pt-6 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Institution & Examination Cards */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl px-3.5 py-1.5 min-w-[140px]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  <Building2 className="h-3 w-3 text-[#6342e8]" />
                  <span>Institution</span>
                </div>
                <div className="text-sm font-bold text-[#6342e8] dark:text-purple-300">
                  {examInfo?.college || 'College Name'}
                </div>
              </div>

              <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl px-3.5 py-1.5 min-w-[160px]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  <GraduationCap className="h-3 w-3 text-[#6342e8]" />
                  <span>Examination</span>
                </div>
                <div className="text-sm font-bold text-[#6342e8] dark:text-purple-300">
                  {activeAllotment?.name || examInfo?.examName || 'Examination Duty Allotment'}
                </div>
              </div>
            </div>

            {/* Live Metrics Chips Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">INVIGILATORS</div>
                <div className="text-sm font-bold text-[#6342e8]">{totalRooms}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Relievers</div>
                <div className="text-sm font-bold text-[#8b5cf6]">{totalRelievers}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Staff Req.</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalInvigilatorsRequired}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Allotted</div>
                <div className="text-sm font-bold text-[#f59e0b]">{totalDutiesAllotted}</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 sm:px-12 pb-6 pt-0">
          <div className="relative group/allotment-table">
            {/* Viewport Center Flying Navigation Arrows (Fixed at 50% screen height, strictly on outer flanks) */}
            {/* Left Flying Arrow (Strictly to the left of Serial No.) */}
            <button
              type="button"
              onPointerDown={(e) => handlePointerDown('left', e)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              disabled={!canScrollLeft || !arrowPositions.isVisible}
              aria-label="Scroll left to see previous exam columns"
              style={{
                position: 'fixed',
                top: '50%',
                left: `${Math.max(8, arrowPositions.leftX - 48)}px`,
                transform: 'translateY(-50%)',
                zIndex: 50,
              }}
              className={cn(
                "flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full",
                "bg-white dark:bg-slate-900 border-2 border-[#6342e8] text-[#6342e8] dark:text-purple-300",
                "shadow-2xl shadow-purple-500/30 backdrop-blur-md transition-opacity duration-200 cursor-pointer select-none",
                "hover:bg-[#6342e8] hover:text-white hover:scale-110 active:scale-95 active:bg-[#5232d6]",
                canScrollLeft && arrowPositions.isVisible
                  ? "opacity-95 hover:opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none scale-75"
              )}
              title="Click to scroll left, hold for continuous scroll"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </button>

            {/* Right Flying Arrow (Strictly to the right of Total) */}
            <button
              type="button"
              onPointerDown={(e) => handlePointerDown('right', e)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              disabled={!canScrollRight || !arrowPositions.isVisible}
              aria-label="Scroll right to see more exam columns"
              style={{
                position: 'fixed',
                top: '50%',
                left: `${Math.min(typeof window !== 'undefined' ? window.innerWidth - 52 : 1200, arrowPositions.rightX + 4)}px`,
                transform: 'translateY(-50%)',
                zIndex: 50,
              }}
              className={cn(
                "flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full",
                "bg-white dark:bg-slate-900 border-2 border-[#6342e8] text-[#6342e8] dark:text-purple-300",
                "shadow-2xl shadow-purple-500/30 backdrop-blur-md transition-opacity duration-200 cursor-pointer select-none",
                "hover:bg-[#6342e8] hover:text-white hover:scale-110 active:scale-95 active:bg-[#5232d6]",
                canScrollRight && arrowPositions.isVisible
                  ? "opacity-95 hover:opacity-100 pointer-events-auto animate-pulse hover:animate-none"
                  : "opacity-0 pointer-events-none scale-75"
              )}
              title="Click to scroll right, hold for continuous scroll"
            >
              <ChevronRight className="h-6 w-6 stroke-[2.5]" />
            </button>

            {/* Normal Full-Height Table Container (no max-h, natural page height) */}
            <div
              ref={tableContainerRef}
              onScroll={checkScroll}
              className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto shadow-2xs bg-white dark:bg-slate-900 scroll-smooth"
            >
              <table className="min-w-full border-collapse text-sm">
                <TableHeader>
                  <TableRow className="bg-[#f8f9fc] dark:bg-slate-800/60 hover:bg-[#f8f9fc] border-b border-slate-200/80 dark:border-slate-800">
                    <TableHead className="sticky left-0 bg-[#f8f9fc] dark:bg-slate-900/95 backdrop-blur-sm z-20 w-12 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center border-r border-slate-200/80 dark:border-slate-800">
                      #
                    </TableHead>
                    <TableHead className="sticky left-12 bg-[#f8f9fc] dark:bg-slate-900/95 backdrop-blur-sm z-20 min-w-44 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200/80 dark:border-slate-800">
                      Invigilator&apos;s Name
                    </TableHead>
                    <TableHead className="min-w-40 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-r border-slate-200/80 dark:border-slate-800">
                      Designation
                    </TableHead>
                    {examinations.map(exam => (
                      <TableHead
                        key={exam.id}
                        className="whitespace-nowrap h-44 p-2 text-center border-r border-slate-200/60 dark:border-slate-800/80 min-w-12"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        <div className="flex flex-col items-start justify-end w-full pl-1">
                          <span className="text-[13px] font-bold text-[#6342e8] dark:text-purple-400">{formatAppDate(exam.date)}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-h-24 my-0.5">{exam.subject}</span>
                          <span className="text-[11px] text-slate-500 font-normal">{formatTimeTo12Hour(exam.startTime)}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center sticky right-0 bg-[#f8f9fc] dark:bg-slate-900/95 backdrop-blur-sm z-20 min-w-16 font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-l border-slate-200/80 dark:border-slate-800">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {invigilators.map((invigilator, index) => {
                    const duties = allotmentResult.assignments[invigilator.id] || [];
                    const dutyCount = duties.length;

                    return (
                      <TableRow
                        key={invigilator.id}
                        className={cn(
                          "transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/70 group/row",
                          index % 2 === 1 && "bg-slate-50/30 dark:bg-slate-800/20"
                        )}
                      >
                        <TableCell
                          className={cn(
                            "sticky left-0 z-10 text-center font-medium text-xs text-slate-500 dark:text-slate-400 group-hover/row:text-slate-700 dark:group-hover/row:text-slate-200 border-r border-slate-200/60 dark:border-slate-800 transition-colors",
                            index % 2 === 1 ? "bg-[#fbfcfe] dark:bg-[#0d1629]" : "bg-white dark:bg-slate-900",
                            "group-hover/row:bg-slate-100 dark:group-hover/row:bg-slate-800"
                          )}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "font-semibold text-xs sticky left-12 z-10 border-r border-slate-200/60 dark:border-slate-800 transition-colors",
                            index % 2 === 1 ? "bg-[#fbfcfe] dark:bg-[#0d1629]" : "bg-white dark:bg-slate-900",
                            "group-hover/row:bg-slate-100 dark:group-hover/row:bg-slate-800",
                            "text-slate-900 dark:text-slate-100 group-hover/row:text-slate-950 dark:group-hover/row:text-white"
                          )}
                        >
                          {invigilator.name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400 group-hover/row:text-slate-700 dark:group-hover/row:text-slate-200 border-r border-slate-200/60 dark:border-slate-800 transition-colors">
                          {invigilator.designation}
                        </TableCell>
                        {examinations.map(exam => {
                          const hasDuty = duties.includes(exam.id);
                          const examDate = format(new Date(exam.date), 'yyyy-MM-dd');

                          return (
                            <TableCell
                              key={exam.id}
                              className="p-1 text-center cursor-pointer transition-colors hover:bg-purple-50/60 dark:hover:bg-purple-950/40 border-r border-slate-200/40 dark:border-slate-800/70"
                              onClick={() => handleDutyToggle(invigilator.id, exam.id)}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-full h-8 flex items-center justify-center">
                                    {hasDuty ? (
                                      <div className={cn(
                                        "font-bold text-xs rounded-md w-6 h-6 flex items-center justify-center shadow-xs transition-all hover:scale-110",
                                        dateColorMap[examDate] || 'bg-purple-100 text-[#6342e8] border border-purple-200 dark:bg-purple-950/70 dark:text-purple-300'
                                      )}>
                                        1
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-300 hover:text-slate-500">0</span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl shadow-md border-slate-200 dark:border-slate-800 text-xs">
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-slate-900 dark:text-white">{exam.subject}</div>
                                    <div className="text-slate-500">{formatAppDateWithDay(exam.date)}</div>
                                    <div className="text-[11px] text-slate-500">{formatTimeTo12Hour(exam.startTime)} – {formatTimeTo12Hour(exam.endTime)}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                        <TableCell
                          className={cn(
                            "text-center sticky right-0 z-10 border-l border-slate-200/60 dark:border-slate-800 transition-colors",
                            index % 2 === 1 ? "bg-[#fbfcfe] dark:bg-[#0d1629]" : "bg-white dark:bg-slate-900",
                            "group-hover/row:bg-slate-100 dark:group-hover/row:bg-slate-800"
                          )}
                        >
                          <div className="bg-purple-50 dark:bg-purple-950/60 text-[#6342e8] dark:text-purple-300 border border-purple-100 dark:border-purple-900/50 font-bold rounded-lg w-7 h-7 flex items-center justify-center mx-auto text-xs">
                            {dutyCount}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter className="border-t-2 border-slate-200 dark:border-slate-800 font-medium bg-slate-50/50 dark:bg-slate-900/60">
                  {/* Invigilators Row */}
                  <TableRow className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
                    <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-50/90 dark:bg-slate-900/90 z-10">
                      No of Invigilators
                    </TableCell>
                    {examinations.map((exam) => (
                      <TableCell key={`rooms-${exam.id}`} className="text-center text-xs font-bold text-[#6342e8] dark:text-purple-400">
                        {exam.rooms}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-xs text-[#6342e8] dark:text-purple-400 sticky right-0 bg-slate-50/90 dark:bg-slate-900/90 z-10 border-l border-slate-200/60 dark:border-slate-800">
                      {totalRooms}
                    </TableCell>
                  </TableRow>

                  {/* Relievers Row */}
                  <TableRow className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
                    <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-50/90 dark:bg-slate-900/90 z-10">
                      No of Relievers
                    </TableCell>
                    {examinations.map((exam) => (
                      <TableCell key={`relievers-${exam.id}`} className="text-center text-xs font-bold text-[#8b5cf6] dark:text-purple-400">
                        {exam.relievers}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-xs text-[#8b5cf6] dark:text-purple-400 sticky right-0 bg-slate-50/90 dark:bg-slate-900/90 z-10 border-l border-slate-200/60 dark:border-slate-800">
                      {totalRelievers}
                    </TableCell>
                  </TableRow>

                  {/* Total Invigilators Required Row */}
                  <TableRow className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-900/80">
                    <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 sticky left-0 bg-slate-100/90 dark:bg-slate-900 z-10">
                      Total Required
                    </TableCell>
                    {examinations.map((exam) => (
                      <TableCell key={`invigilators-${exam.id}`} className="text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                        {exam.rooms + exam.relievers}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 sticky right-0 bg-slate-100 dark:bg-slate-900 z-10 border-l border-slate-200/60 dark:border-slate-800">
                      {totalInvigilatorsRequired}
                    </TableCell>
                  </TableRow>

                  {/* Total Duties Allotted Row */}
                  <TableRow className="hover:bg-purple-50/40 dark:hover:bg-slate-800/40 bg-purple-50/30 dark:bg-purple-950/20">
                    <TableCell colSpan={3} className="text-right font-bold text-xs uppercase tracking-wider text-[#6342e8] dark:text-purple-400 sticky left-0 bg-purple-50/90 dark:bg-purple-950/90 z-10">
                      Total Allotted
                    </TableCell>
                    {dutiesPerExam.map((count, index) => {
                      const exam = examinations[index];
                      const requiredInvigilators = exam.rooms + exam.relievers;
                      const isMismatch = count !== requiredInvigilators;
                      return (
                        <TableCell
                          key={`total-duties-${exam.id}`}
                          className={cn(
                            "text-center text-xs font-bold",
                            isMismatch ? "text-destructive font-black" : "text-[#6342e8] dark:text-purple-400"
                          )}
                        >
                          {count}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-black text-xs text-[#6342e8] dark:text-purple-400 sticky right-0 bg-purple-50/90 dark:bg-purple-950/90 z-10 border-l border-slate-200/60 dark:border-slate-800">
                      {totalDutiesAllotted}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </table>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800">
          <AlertDialog open={isSaveAlertOpen} onOpenChange={setIsSaveAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-slate-200 dark:border-slate-800 hover:border-[#6342e8]/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs h-9">
                <Save className="mr-2 h-3.5 w-3.5 text-[#6342e8]" />
                Save Allotment
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Save Allotment Sheet</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500">
                  Save this current configuration to resume editing or download reports later from the &quot;Saved Allotments&quot; page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="save-sheet-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Allotment Sheet Name
                </Label>
                <Input
                  id="save-sheet-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="mt-1.5 rounded-xl"
                  placeholder="e.g. Mid-Term Invigilation 2027"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#6342e8] hover:bg-[#5232d6] text-white rounded-xl font-semibold text-xs px-4 py-2"
                >
                  Save Allotment
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Duplicate Allotment Title Confirmation Dialog */}
          <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
            <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 max-w-md">
              <AlertDialogHeader className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-8 ring-amber-50/50 dark:ring-amber-950/20">
                  <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
                </div>
                <AlertDialogTitle className="text-center text-lg font-bold text-slate-900 dark:text-white">
                  Allotment Already Exists
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  An allotment titled <strong className="font-semibold text-slate-900 dark:text-white">&quot;{duplicateTarget?.name}&quot;</strong> already exists in your <span className="font-semibold text-[#6342e8]">Saved Allotments</span>.
                  <br /><br />
                  Would you like to replace the existing allotment, or save this as a new allotment?
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="flex flex-col gap-2.5 pt-3">
                <Button
                  type="button"
                  onClick={handleReplaceAllotment}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs h-10 shadow-xs gap-2 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  Replace the Allotment
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAsNewAllotment}
                  className="w-full bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold rounded-xl text-xs h-10 shadow-xs gap-2 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Save as a New Allotment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDuplicateAlertOpen(false);
                    setDuplicateTarget(null);
                  }}
                  className="w-full rounded-xl text-xs h-9 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 mt-1"
                >
                  Cancel
                </Button>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleDownload}
            className="bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold rounded-xl text-xs h-9 shadow-xs"
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Download PDF Report
          </Button>
        </CardFooter>
      </Card>

      <SubscriptionDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
        category="master_roster"
      />
    </TooltipProvider>
  );
}
