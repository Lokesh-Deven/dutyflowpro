"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Invigilator, Examination, AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Download,
  FolderArchive,
  Clock,
  Calendar as CalendarIcon,
  BookOpen,
  Mail,
  Sun,
  Moon,
  Phone,
  User,
  CalendarCheck,
  Building2,
  Briefcase,
  Layers,
  Sparkles,
  ListChecks,
  Edit2,
  Signature,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatAppDate } from '@/lib/date-utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAllotment } from '@/lib/allotment-context';
import { useAuth } from '@/lib/auth-context';
import { uploadUserFile } from '@/lib/storage-service';
import { cn, formatTimeTo12Hour, getInvigilatorInitial } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubscriptionDialog } from '@/components/dashboard/subscription-dialog';

type IndividualDashboardProps = {
  invigilators: Invigilator[];
  examinations: Examination[];
  allotmentResult: AllotmentResult;
};

export default function IndividualDashboard({ invigilators, examinations, allotmentResult }: IndividualDashboardProps) {
  const { toast } = useToast();
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBulkEmailConfirmOpen, setIsBulkEmailConfirmOpen] = useState(false);
  const [isSingleEmailSending, setIsSingleEmailSending] = useState(false);
  const [isBulkEmailSending, setIsBulkEmailSending] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [customSubscriptionMessage, setCustomSubscriptionMessage] = useState<string | undefined>(undefined);
  const [emailSuccessDialog, setEmailSuccessDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    recipient?: string;
  }>({
    open: false,
    title: 'Email Sent',
    message: '',
  });
  const { activeAllotment, instructions, signatory } = useAllotment();
  const { user, profile, isSubscribed, canDownload, recordCategoryDownload } = useAuth();

  useEffect(() => {
    if (invigilators.length > 0 && !selectedInvigilatorId) {
      setSelectedInvigilatorId(invigilators[0].id);
    }
  }, [invigilators, selectedInvigilatorId]);

  const selectedInvigilator = useMemo(() => {
    return invigilators.find(inv => inv.id === selectedInvigilatorId);
  }, [selectedInvigilatorId, invigilators]);

  const assignedDuties = useMemo(() => {
    if (!selectedInvigilatorId || !allotmentResult.assignments) return [];
    const dutyIds = allotmentResult.assignments[selectedInvigilatorId] || [];
    return examinations
      .filter(exam => dutyIds.includes(exam.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedInvigilatorId, allotmentResult, examinations]);

  const generateInvigilatorPDF = (invigilator: Invigilator, assignedDuties: Examination[]) => {
    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

    // Clean white page background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Helper: Format timings cleanly
    const formatDutyTiming = (startTime: string, endTime: string) => {
      const formatSingle = (timeStr: string) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          let h = parseInt(parts[0], 10);
          const m = parts[1];
          const ampm = h >= 12 ? 'PM' : 'AM';
          if (h > 12) h = h - 12;
          if (h === 0) h = 12;
          return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
        }
        return timeStr;
      };
      return `${formatSingle(startTime)} – ${formatSingle(endTime)}`;
    };

    const collegeName = examinations[0]?.college
      || (profile?.institution_name && profile.institution_name !== 'Guest Profile' ? profile.institution_name : null)
      || (user?.user_metadata?.institution_name as string)
      || activeAllotment?.examinations[0]?.college
      || profile?.institution_name
      || "College Name";
    const examName = assignedDuties.length > 0
      ? assignedDuties[0].examName
      : (examinations[0]?.examName || activeAllotment?.examinations[0]?.examName || 'Annual Examination - August 2026');

    const cardX = 12;
    const cardW = pageWidth - 24; // 186mm

    // ═══════════════════════════════════════════════════════════════
    // 1. TOP HERO BANNER CARD (Vibrant Royal Indigo & Purple Banner)
    // ═══════════════════════════════════════════════════════════════
    const headerY = 12;
    const headerH = 42;

    // Main Header Card Fill (Deep Royal Indigo #3730A3)
    doc.setFillColor(55, 48, 163); // #3730A3
    doc.roundedRect(cardX, headerY, cardW, headerH, 4, 4, 'F');

    // Golden / Amber Bottom Accent Stripe on the Banner
    doc.setFillColor(245, 158, 11); // Amber-500 (#F59E0B)
    doc.rect(cardX, headerY + headerH - 1.8, cardW, 1.8, 'F');

    // Institution Name (Bold, Crisp White, Centered)
    const collegeFontSize = collegeName.length > 42 ? 14 : 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(collegeFontSize);
    doc.setTextColor(255, 255, 255);
    doc.text(collegeName.toUpperCase(), pageWidth / 2, headerY + 14.5, { align: 'center' });

    // Examination Name Pill (Soft Lavender / Golden Tag)
    const examBadgeY = headerY + 19;
    const examText = examName.toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const examTextW = doc.getTextWidth(examText);
    const examPillW = examTextW + 10;
    const examPillX = (pageWidth - examPillW) / 2;

    doc.setFillColor(67, 56, 202); // #4338CA
    doc.setDrawColor(165, 180, 252);
    doc.setLineWidth(0.35);
    doc.roundedRect(examPillX, examBadgeY, examPillW, 6, 2, 2, 'FD');

    doc.setTextColor(254, 240, 138); // Soft Gold (#FEF08A)
    doc.text(examText, pageWidth / 2, examBadgeY + 4.3, { align: 'center' });

    // Title: "INVIGILATOR'S DUTY SUMMARY" (Crisp Bold White)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("INVIGILATOR'S DUTY SUMMARY", pageWidth / 2, headerY + 34.5, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════
    // 2. FACULTY PROFILE CARD (Spacious Colorful Identity Card)
    // ═══════════════════════════════════════════════════════════════
    const profCardY = headerY + headerH + 6; // 60mm
    const profCardH = 27;

    // Card Fill with Soft Border
    doc.setFillColor(248, 250, 255); // #F8FAFF
    doc.setDrawColor(224, 231, 255); // #E0E7FF
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, profCardY, cardW, profCardH, 4, 4, 'FD');

    // Left Vibrant Cyan/Teal Accent Bar
    doc.setFillColor(14, 165, 233); // Sky-500 (#0EA5E9)
    doc.roundedRect(cardX, profCardY, 4, profCardH, 1.8, 1.8, 'F');

    // Circular Avatar Badge with Gradient feel (Royal Indigo)
    const avatarX = cardX + 17;
    const avatarY = profCardY + profCardH / 2;
    doc.setFillColor(79, 70, 229); // #4F46E5
    doc.circle(avatarX, avatarY, 8.5, 'F');

    const initial = getInvigilatorInitial(invigilator.name);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.setTextColor(255, 255, 255);
    doc.text(initial, avatarX, avatarY + 0.4, { align: 'center', baseline: 'middle' });

    // Faculty Information Details
    const infoX = cardX + 31;

    // Name (Bold Deep Slate)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // #0F172A
    doc.text(invigilator.name, infoX, profCardY + 8);

    // Designation (Indigo Accent)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(79, 70, 229); // #4F46E5
    doc.text(invigilator.designation || 'Faculty Invigilator', infoX, profCardY + 14.5);

    // Contact Information (Clean text)
    const phoneVal = invigilator.mobile ? `Phone: ${invigilator.mobile}` : 'Phone: —';
    const emailVal = invigilator.email ? `Email: ${invigilator.email}` : 'Email: —';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`${phoneVal}    •    ${emailVal}`, infoX, profCardY + 21.5);

    // Right Stat Box: "ALLOTTED DUTIES"
    const statW = 42;
    const statH = 20;
    const statX = cardX + cardW - statW - 4;
    const statY = profCardY + (profCardH - statH) / 2;

    doc.setFillColor(238, 242, 255); // #EEF2FF
    doc.setDrawColor(199, 210, 254); // #C7D2FE
    doc.setLineWidth(0.4);
    doc.roundedRect(statX, statY, statW, statH, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(79, 70, 229); // #4F46E5
    doc.text("ALLOTTED DUTIES", statX + statW / 2, statY + 4.6, { align: 'center' });

    // Number: 25pt placed at center leaving equal space to top and bottom text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.setTextColor(55, 48, 163); // #3730A3
    doc.text(String(assignedDuties.length), statX + statW / 2, statY + 10.0, { align: 'center', baseline: 'middle' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Sessions Assigned", statX + statW / 2, statY + 16.8, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════
    // 3. DUTY SCHEDULE SECTION (Spacious Schedule Card + Table)
    // ═══════════════════════════════════════════════════════════════
    const schedY = profCardY + profCardH + 6; // 93mm

    // Schedule Header Banner (Royal Indigo / Blue #4F46E5)
    const bannerH = 7.5;
    doc.setFillColor(79, 70, 229); // #4F46E5
    doc.roundedRect(cardX, schedY, cardW, bannerH, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("ALLOTMENT SCHEDULE", cardX + cardW / 2, schedY + bannerH / 2, { align: 'center', baseline: 'middle' });

    const tableStartY = schedY + bannerH + 2;
    const tableHead = [['#', 'Date', 'Day', 'Subject / Paper', 'Timings']];
    const tableBody = assignedDuties.map((duty, index) => [
      index + 1,
      format(new Date(duty.date), "dd.MM.yyyy"),
      format(new Date(duty.date), "EEEE"),
      duty.subject,
      formatDutyTiming(duty.startTime, duty.endTime)
    ]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      margin: { left: cardX, right: cardX },
      theme: 'plain',
      headStyles: {
        fillColor: [67, 56, 202], // #4338CA
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 9.5,
        cellPadding: 3.8
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { halign: 'center', cellWidth: 32, fontSize: 9.5, textColor: [30, 41, 59] },
        2: { halign: 'center', cellWidth: 32, fontSize: 9.5, textColor: [71, 85, 105] },
        3: { halign: 'left', cellWidth: 62, fontStyle: 'bold', fontSize: 9.5, textColor: [15, 23, 42] },
        4: { halign: 'center', cellWidth: 46 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255] // Soft Indigo Tint
      },
      styles: {
        fontSize: 9.5,
        cellPadding: 3.8,
        valign: 'middle',
        lineColor: [224, 231, 255],
        lineWidth: 0.3
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && (data.column.index === 0 || data.column.index === 4)) {
          data.cell.text = [];
        }
      },
      didDrawCell: (data: any) => {
        // Col 0: Indigo circular badge
        if (data.section === 'body' && data.column.index === 0) {
          const { x, y, width, height } = data.cell;
          const cx = x + width / 2;
          const cy = y + height / 2;
          doc.setFillColor(79, 70, 229);
          doc.circle(cx, cy, 3.8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(String(data.row.index + 1), cx, cy, { align: 'center', baseline: 'middle' });
        }

        // Col 4: Soft Cyan timing pill capsule
        if (data.section === 'body' && data.column.index === 4) {
          const { x, y, width, height } = data.cell;
          const pillW = 42;
          const pillH = 6.8;
          const px = x + (width - pillW) / 2;
          const py = y + (height - pillH) / 2;
          const timingText = data.cell.raw;

          doc.setFillColor(236, 254, 255); // Cyan-50 (#ECFEFF)
          doc.setDrawColor(165, 243, 252); // Cyan-200 (#A5F3FC)
          doc.setLineWidth(0.25);
          doc.roundedRect(px, py, pillW, pillH, 2.5, 2.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(8, 145, 178); // Cyan-600 (#0891B2)
          doc.text(String(timingText), px + pillW / 2, py + pillH / 2, { align: 'center', baseline: 'middle' });
        }
      }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || 135;

    // ═══════════════════════════════════════════════════════════════
    // 4. GENERAL INSTRUCTIONS (Well-Spaced, Elegant 2-Column Card)
    // ═══════════════════════════════════════════════════════════════
    const instY = finalTableY + 6;
    const enabledInstructions = (instructions || []).filter(i => i.enabled);

    if (enabledInstructions.length > 0) {
      // Instructions Header Mini-Banner (Cyan Accent)
      const instBannerH = 7;
      doc.setFillColor(14, 165, 233); // Sky-500 (#0EA5E9)
      doc.roundedRect(cardX, instY, cardW, instBannerH, 2.5, 2.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("IMPORTANT INSTRUCTIONS", cardX + cardW / 2, instY + instBannerH / 2, { align: 'center', baseline: 'middle' });

      // Well-spaced Instructions Box
      const instBoxY = instY + instBannerH + 2;
      const half = Math.ceil(enabledInstructions.length / 2);
      const leftList = enabledInstructions.slice(0, half);
      const rightList = enabledInstructions.slice(half);
      const hasTwoColumns = rightList.length > 0;
      const maxRows = Math.max(leftList.length, rightList.length, 1);
      const rowStepH = 9.8;
      const instBoxH = maxRows * rowStepH + 3;

      doc.setFillColor(248, 250, 252); // #F8FAFC
      doc.setDrawColor(226, 232, 240); // #E2E8F0
      doc.setLineWidth(0.4);
      doc.roundedRect(cardX, instBoxY, cardW, instBoxH, 3, 3, 'FD');

      // Center Divider Line (only if 2 columns)
      const midColX = cardX + cardW / 2;
      if (hasTwoColumns) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.line(midColX, instBoxY + 2.5, midColX, instBoxY + instBoxH - 2.5);
      }

      const colTextW = hasTwoColumns ? (cardW / 2) - 15 : cardW - 18;

      // Left Column
      leftList.forEach((item, idx) => {
        const itemCenterY = instBoxY + 1.5 + idx * rowStepH + (rowStepH / 2);

        // Circular indigo badge
        doc.setFillColor(79, 70, 229);
        doc.circle(cardX + 6, itemCenterY, 2.6, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(String(idx + 1), cardX + 6, itemCenterY, { align: 'center', baseline: 'middle' });

        // Text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(30, 41, 59); // Slate-800
        const textLines = doc.splitTextToSize(item.text, colTextW);
        doc.text(textLines, cardX + 11.5, itemCenterY - 1, { lineHeightFactor: 1.2 });
      });

      // Right Column
      rightList.forEach((item, idx) => {
        const itemCenterY = instBoxY + 1.5 + idx * rowStepH + (rowStepH / 2);

        // Circular indigo badge
        doc.setFillColor(79, 70, 229);
        doc.circle(midColX + 6, itemCenterY, 2.6, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(String(leftList.length + idx + 1), midColX + 6, itemCenterY, { align: 'center', baseline: 'middle' });

        // Text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(30, 41, 59); // Slate-800
        const textLines = doc.splitTextToSize(item.text, colTextW);
        doc.text(textLines, midColX + 11.5, itemCenterY - 1, { lineHeightFactor: 1.2 });
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. AUTHORISED SIGNATORY & DIGITAL VERIFICATION FOOTER
    // ═══════════════════════════════════════════════════════════════
    const footerH = 8;
    const footerY = pageHeight - footerH - 8; // 281mm on A4 portrait
    const footerW = cardW;

    // 5a. Signatory Details (Placed Just Above the Footer, 2 Lines Aligned to the Right)
    const signatoryName = signatory?.name?.trim() || "";
    const signatoryDesignation = signatory?.designation?.trim() || "";
    const institutionName = collegeName?.trim() || "";
    const sigRightX = cardX + footerW - 2;
    const signatoryY = footerY - 13;

    // Line 1: Signatory Name (13pt bold matching invigilator name size) or "Authorised Signatory"
    if (signatoryName) {
      const nameText = signatoryName;
      const prefix = "Issued by ";
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const nameW = doc.getTextWidth(nameText);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(8, 145, 178); // Dark Cyan (#0891B2)
      doc.text(prefix, sigRightX - nameW, signatoryY + 4, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // Deep Slate (#0F172A)
      doc.text(nameText, sigRightX, signatoryY + 4, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // Deep Slate (#0F172A)
      doc.text("Authorised Signatory", sigRightX, signatoryY + 4, { align: 'right' });
    }

    // Line 2: "[Designation], [Institution]"
    const line2Parts = [signatoryDesignation, institutionName].filter(Boolean);
    const line2Text = line2Parts.join(', ');
    if (line2Text) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // Slate-600 (#475569)
      doc.text(line2Text, sigRightX, signatoryY + 9.5, { align: 'right' });
    }

    // 5b. Footer Bar (Single Line Compact Card matching header color #3730A3)
    doc.setFillColor(55, 48, 163); // #3730A3
    doc.roundedRect(cardX, footerY, footerW, footerH, 2, 2, 'F');

    // Golden / Amber Top Accent Stripe
    doc.setFillColor(245, 158, 11); // Amber-500 (#F59E0B)
    doc.rect(cardX, footerY, footerW, 0.9, 'F');

    // Right side: "Digitally Generated Document - Signature Not Required"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(224, 231, 255); // Indigo-100 (#E0E7FF)
    doc.text("Digitally Generated Document - Signature Not Required", cardX + footerW - 5, footerY + 5.2, { align: 'right' });

    return doc;
  };

  const handleDownload = () => {
    if (!selectedInvigilator) return;
    const check = canDownload('individual_profile');
    if (!check.allowed) {
      setCustomSubscriptionMessage(undefined);
      setIsSubscriptionDialogOpen(true);
      return;
    }

    recordCategoryDownload('individual_profile');
    toast({
      title: "Generating PDF...",
      description: `Preparing summary for ${selectedInvigilator.name}.`,
    });
    const doc = generateInvigilatorPDF(selectedInvigilator, assignedDuties);
    const fileName = `Duty_Summary_${selectedInvigilator.name.replace(/ /g, '_')}.pdf`;
    const pdfBlob = doc.output('blob');
    doc.save(fileName);

    // Save generated faculty PDF to Supabase Storage per user
    if (user?.id) {
      uploadUserFile({
        file: pdfBlob,
        fileName,
        fileType: 'pdf',
        category: 'download',
        subCategory: 'duty_summary',
        userId: user.id,
        metadata: {
          invigilatorId: selectedInvigilator.id,
          invigilatorName: selectedInvigilator.name,
          designation: selectedInvigilator.designation,
          dutyCount: assignedDuties.length,
          examName,
        },
        mimeType: 'application/pdf',
      }).then(({ error }) => {
        if (!error) {
          toast({
            title: "Cloud Backup Complete",
            description: `"${fileName}" has been saved to your Supabase storage.`,
          });
        }
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!isSubscribed) {
      setCustomSubscriptionMessage("Bulk download of all invigilators' summaries exceeds the 3-profile limit. Please subscribe to download the complete roster.");
      setIsSubscriptionDialogOpen(true);
      return;
    }

    const totalInvigilatorsCount = invigilators.length;
    recordCategoryDownload('individual_profile', totalInvigilatorsCount);
    toast({
      title: "Generating ZIP...",
      description: `Creating duty summaries for all ${totalInvigilatorsCount} invigilators.`,
    });

    const zip = new JSZip();
    for (const inv of invigilators) {
      const dutyIds = allotmentResult.assignments[inv.id] || [];
      const duties = examinations.filter(exam => dutyIds.includes(exam.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const doc = generateInvigilatorPDF(inv, duties);
      zip.file(`Duty_Summary_${inv.name.replace(/ /g, '_')}.pdf`, doc.output('blob'));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `All_Invigilator_Duty_Summaries.zip`;
    saveAs(content, zipFileName);

    // Save generated ZIP archive to Supabase Storage per user
    if (user?.id) {
      uploadUserFile({
        file: content,
        fileName: zipFileName,
        fileType: 'zip',
        category: 'download',
        subCategory: 'all_summaries_zip',
        userId: user.id,
        metadata: {
          invigilatorCount: invigilators.length,
          examName,
        },
        mimeType: 'application/zip',
      }).then(({ error }) => {
        if (!error) {
          toast({
            title: "Cloud Backup Complete",
            description: `"${zipFileName}" has been saved to your Supabase storage.`,
          });
        }
      });
    }
  };

  const examName = examinations[0]?.examName || activeAllotment?.examinations[0]?.examName || 'Examination Session';
  const collegeName = examinations[0]?.college
    || (profile?.institution_name && profile.institution_name !== 'Guest Profile' ? profile.institution_name : null)
    || (user?.user_metadata?.institution_name as string)
    || activeAllotment?.examinations[0]?.college
    || profile?.institution_name
    || "College Name";

  const docToBase64 = async (doc: jsPDF): Promise<string> => {
    const blob = doc.output('blob');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSendSingleEmail = async () => {
    if (!selectedInvigilator) return;

    const targetEmail = selectedInvigilator.email?.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Email Address Missing',
        description: `No valid email address found for ${selectedInvigilator.name}. Please ensure a valid email is present.`,
      });
      return;
    }

    try {
      setIsSingleEmailSending(true);
      toast({
        title: 'Preparing Duty Summary...',
        description: `Generating PDF and dispatching email to ${selectedInvigilator.name}...`,
      });

      const doc = generateInvigilatorPDF(selectedInvigilator, assignedDuties);
      const pdfBase64 = await docToBase64(doc);
      const fileName = `Duty_Summary_${selectedInvigilator.name.replace(/ /g, '_')}.pdf`;

      const response = await fetch('/api/send-duty-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              to: targetEmail,
              invigilatorName: selectedInvigilator.name,
              pdfBase64,
              fileName,
            },
          ],
          examName,
          collegeName,
        }),
      });

      const result = await response.json();

      if (response.ok && result.sent > 0) {
        toast({
          title: 'Email Sent Successfully!',
          description: `Personalized duty summary with PDF attachment has been delivered to ${selectedInvigilator.name} (${targetEmail}).`,
        });
        setEmailSuccessDialog({
          open: true,
          title: 'Email Sent',
          message: `Personalized duty summary with PDF attachment has been successfully delivered to ${selectedInvigilator.name}.`,
          recipient: targetEmail,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Email Dispatch Failed',
          description: result.error || result.results?.[0]?.error || 'Failed to send email. Please check your SendGrid configuration in .env.local.',
        });
      }
    } catch (err: any) {
      console.error('Error sending single duty summary email:', err);
      toast({
        variant: 'destructive',
        title: 'Error Dispatching Email',
        description: err.message || 'An unexpected network error occurred.',
      });
    } finally {
      setIsSingleEmailSending(false);
    }
  };

  const handleExecuteBulkEmail = async () => {
    setIsBulkEmailConfirmOpen(false);

    const eligibleInvigilators = invigilators.filter(i => i.email && i.email.includes('@'));
    if (eligibleInvigilators.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Valid Email Addresses',
        description: 'None of the invigilators have valid email addresses configured.',
      });
      return;
    }

    setIsBulkEmailSending(true);
    toast({
      title: 'Preparing Bulk Email Dispatch...',
      description: `Generating PDFs for ${eligibleInvigilators.length} invigilators. Please wait...`,
    });

    try {
      const items: Array<{
        to: string;
        invigilatorName: string;
        pdfBase64: string;
        fileName: string;
      }> = [];

      for (const inv of eligibleInvigilators) {
        const dutyIds = allotmentResult.assignments[inv.id] || [];
        const duties = examinations
          .filter(exam => dutyIds.includes(exam.id))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const doc = generateInvigilatorPDF(inv, duties);
        const pdfBase64 = await docToBase64(doc);
        items.push({
          to: inv.email.trim(),
          invigilatorName: inv.name,
          pdfBase64,
          fileName: `Duty_Summary_${inv.name.replace(/ /g, '_')}.pdf`,
        });
      }

      // Send in batches of 5 to avoid large HTTP payloads and rate limit spikes
      const BATCH_SIZE = 5;
      let totalSent = 0;
      let totalFailed = 0;
      const errorMessages: string[] = [];

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const response = await fetch('/api/send-duty-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: batch,
            examName,
            collegeName,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          totalSent += result.sent || 0;
          totalFailed += result.failed || 0;
          if (result.results) {
            result.results
              .filter((r: any) => !r.success)
              .forEach((r: any) => errorMessages.push(`${r.invigilatorName}: ${r.error}`));
          }
        } else {
          totalFailed += batch.length;
          errorMessages.push(result.error || `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed`);
        }
      }

      if (totalSent > 0) {
        toast({
          title: 'Bulk Email Delivery Complete!',
          description: `Successfully dispatched duty summaries to ${totalSent} of ${items.length} invigilators.${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}`,
        });
        setEmailSuccessDialog({
          open: true,
          title: 'Email Sent',
          message: `Duty summaries have been successfully sent to ${totalSent} invigilator${totalSent > 1 ? 's' : ''}.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Bulk Delivery Failed',
          description: errorMessages[0] || 'Unable to deliver emails. Please ensure SENDGRID_API_KEY and SENDGRID_FROM_EMAIL are set up.',
        });
      }
    } catch (err: any) {
      console.error('Error in bulk email dispatch:', err);
      toast({
        variant: 'destructive',
        title: 'Bulk Delivery Error',
        description: err.message || 'An unexpected error occurred during bulk email dispatch.',
      });
    } finally {
      setIsBulkEmailSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2">
      {/* Top Selector Card - High Prominence Blue */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-900/25 border border-blue-400/30">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-white/15 text-white backdrop-blur-xs ring-1 ring-white/30 shadow-inner shrink-0">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight text-white font-headline">
              Select Invigilator
            </div>
            <div className="text-xs text-blue-100/90 font-medium">
              Choose an invigilator to preview and download duty summary slips
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full sm:w-80 md:w-96">
          <Select onValueChange={setSelectedInvigilatorId} value={selectedInvigilatorId ?? undefined}>
            <SelectTrigger className="w-full h-12 bg-white text-slate-900 font-bold border-2 border-white/90 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 rounded-xl text-sm shadow-md hover:bg-slate-50 transition-all">
              <SelectValue placeholder="Select an invigilator..." />
            </SelectTrigger>
            <SelectContent className="max-h-64 rounded-xl border-slate-200 dark:border-slate-800 shadow-2xl bg-popover text-popover-foreground">
              {invigilators.map(inv => (
                <SelectItem key={inv.id} value={inv.id} className="cursor-pointer font-semibold text-sm py-2.5">
                  {inv.name} <span className="text-xs font-normal text-muted-foreground ml-1.5">({inv.designation || 'Invigilator'})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedInvigilator && (
        <div className="space-y-6">
          {/* Profile Hero Card */}
          <Card className="border border-border/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />

            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 border-4 border-background dark:border-slate-800 shadow-md ring-2 ring-indigo-500/20">
                <AvatarFallback className="text-[52px] font-extrabold bg-[#4F46E5] dark:bg-indigo-600 text-white select-none leading-none flex items-center justify-center">
                  {getInvigilatorInitial(selectedInvigilator.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info Details */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-slate-100">{selectedInvigilator.name}</h2>
                  <Badge variant="outline" className="text-xs font-semibold border-border dark:border-slate-700 text-muted-foreground dark:text-slate-300">
                    {selectedInvigilator.designation}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground dark:text-slate-400">
                  <div className="inline-flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-[#F59E0B] dark:text-amber-400" />
                    <span>{selectedInvigilator.mobile || 'No phone provided'}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-[#0891B2] dark:text-cyan-400" />
                    <span>{selectedInvigilator.email}</span>
                  </div>
                </div>
              </div>

              <div className="md:w-px h-16 bg-border/60 dark:bg-slate-800 hidden md:block" />

              {/* Metric Pill Card: Allotted Duties */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 text-center min-w-44 flex flex-col justify-center">
                <span className="text-[12px] font-bold text-muted-foreground dark:text-slate-400 uppercase tracking-widest block">
                  Allotted Duties
                </span>
                <span className="text-6xl font-black text-[#4F46E5] dark:text-indigo-400 leading-none block my-2">
                  {assignedDuties.length}
                </span>
                <span className="text-xs font-semibold text-muted-foreground dark:text-slate-400 truncate max-w-[150px] block mx-auto">
                  {assignedDuties.length === 1 ? '1 Session' : `${assignedDuties.length} Sessions Assigned`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Duty Schedule Table Card */}
          <Card className="border border-border/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] to-[#4F46E5]" />

            <CardHeader className="pb-4 pt-5 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-[#0891B2] dark:text-cyan-300">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-lg font-bold text-foreground dark:text-slate-100">Assigned Duty Schedule</CardTitle>
                  </div>
                </div>

                <Badge className="bg-[#0891B2]/10 text-[#0891B2] dark:text-cyan-300 border-[#0891B2]/30 text-xs font-semibold">
                  {assignedDuties.length} {assignedDuties.length === 1 ? 'Duty' : 'Duties'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              <div className="rounded-xl border border-border/70 dark:border-slate-800 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-slate-900/80 hover:bg-muted/50 dark:hover:bg-slate-900/80 border-b border-border/70 dark:border-slate-800">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center w-28">Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Day</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Timings</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedDuties.length > 0 ? (
                      assignedDuties.map((duty, index) => {
                        const startHour = parseInt(duty.startTime.split(':')[0], 10);
                        const isMorning = startHour < 12;

                        return (
                          <TableRow
                            key={duty.id}
                            className={cn(
                              "transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/40",
                              index % 2 === 1 && "bg-muted/15 dark:bg-slate-900/40"
                            )}
                          >
                            <TableCell className="text-center py-3.5">
                              <div className="bg-[#4F46E5] dark:bg-indigo-600 text-white px-3 py-1 rounded-lg inline-flex items-center justify-center gap-1.5 shadow-2xs">
                                <span className="text-sm font-bold">{format(new Date(duty.date), 'dd')}</span>
                                <span className="text-[12px] font-bold uppercase tracking-wider opacity-90">{format(new Date(duty.date), 'MMM')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-xs text-foreground dark:text-slate-200">
                              {format(new Date(duty.date), 'EEEE')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 font-semibold text-sm text-foreground dark:text-slate-100">
                                <BookOpen className="h-3.5 w-3.5 text-[#0891B2] dark:text-cyan-400" />
                                <span>{duty.subject}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 dark:bg-slate-900 border dark:border-slate-800 text-xs font-medium text-muted-foreground dark:text-slate-300">
                                <Clock className="h-3 w-3 text-[#F59E0B] dark:text-amber-400" />
                                <span>{formatTimeTo12Hour(duty.startTime)} – {formatTimeTo12Hour(duty.endTime)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                                isMorning
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30"
                                  : "bg-indigo-500/10 text-[#4F46E5] dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30"
                              )}>
                                {isMorning ? (
                                  <Sun className="h-3 w-3 text-[#F59E0B] dark:text-amber-400" />
                                ) : (
                                  <Moon className="h-3 w-3 text-[#4F46E5] dark:text-indigo-400" />
                                )}
                                <span>{isMorning ? 'Morning' : 'Afternoon'}</span>
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                          No duties assigned for this invigilator in the current allotment sheet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* General Instructions Preview Card */}
          <Card className="border border-border/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1 w-full bg-gradient-to-r from-[#6342e8] to-[#8b5cf6]" />
            <CardHeader className="pb-3 pt-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#6342e8] dark:text-purple-300">
                  <ListChecks className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="font-headline text-base font-bold text-foreground dark:text-slate-100">
                    General Instructions
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Included on this invigilator&apos;s printed duty slip in serial order
                  </CardDescription>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg border-purple-200 dark:border-purple-800/80 text-[#6342e8] hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                <Link href="/dashboard/instructions">
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Customize Instructions
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              {instructions.filter(i => i.enabled).length > 0 ? (
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-[#F6F7FE] dark:bg-slate-900/60 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {instructions
                      .filter(i => i.enabled)
                      .map((item, idx) => (
                        <div key={item.id} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#3B36DB] text-white font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-medium">{item.text}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                  No general instructions currently selected for PDF slips. Click &quot;Customize Instructions&quot; to enable standard guidelines.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorised Signatory & Footer Preview Card */}
          <Card className="border border-border/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-card">
            <div className="h-1 w-full bg-gradient-to-r from-[#3730A3] via-[#4F46E5] to-[#F59E0B]" />
            <CardHeader className="pb-3 pt-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#3730A3] dark:text-indigo-300">
                  <Signature className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="font-headline text-base font-bold text-foreground dark:text-slate-100">
                    Authorised Signatory
                  </CardTitle>
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg border-indigo-200 dark:border-indigo-800/80 text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Link href="/dashboard/signatory">
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Customize Signatory
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0 space-y-3">
              {/* Signatory details above footer - 2 Lines Aligned Right */}
              <div className="flex justify-end pt-1">
                <div className="text-right space-y-0.5">
                  <div className="text-sm font-bold text-foreground dark:text-slate-100 tracking-tight">
                    {signatory?.name?.trim() ? (
                      <>
                        <span className="text-[#0891B2] dark:text-cyan-400 font-semibold mr-1.5">Issued by</span>
                        {signatory.name.trim()}
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs italic font-normal">Authorised Signatory</span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground dark:text-slate-400">
                    {[signatory?.designation?.trim(), collegeName].filter(Boolean).join(', ') || (collegeName ? collegeName : 'Institution / Department')}
                  </div>
                </div>
              </div>

              {/* Single Line Footer Banner with Right Alignment */}
              <div className="relative overflow-hidden rounded-lg bg-[#3730A3] py-2 px-3.5 text-white shadow-md border-t-2 border-amber-500 flex justify-end text-xs">
                <span className="text-[10px] font-medium text-indigo-200 tracking-tight">
                  Digitally Generated Document - Signature Not Required
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-4 pt-4 border-t border-border/70">
        {/* Bulk Actions Column (Left) */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto border-[#0891B2]/40 text-[#0891B2] hover:bg-[#0891B2]/10 dark:text-cyan-400 font-semibold rounded-lg h-10 px-5"
            onClick={() => {
              if (!isSubscribed) {
                setCustomSubscriptionMessage("Bulk download of all invigilators' summaries exceeds the 3-profile limit. Please subscribe to download the complete roster.");
                setIsSubscriptionDialogOpen(true);
              } else {
                setIsConfirmOpen(true);
              }
            }}
          >
            <FolderArchive className="mr-2 h-4 w-4" /> Download All Invigilators&apos; Summaries
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-blue-600/40 text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-950/40 font-semibold rounded-lg h-10 px-5 shadow-2xs"
            onClick={() => setIsBulkEmailConfirmOpen(true)}
            disabled={isBulkEmailSending}
          >
            {isBulkEmailSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                Sending emails to all...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send email to all Invigilators
              </>
            )}
          </Button>
        </div>

        {/* Individual Actions Column (Right) */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto">
          <Button
            className="w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg h-10 px-6 shadow-sm"
            onClick={handleDownload}
          >
            <Download className="mr-2 h-4 w-4" /> Download Individual PDF
          </Button>
          <Button
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg h-10 px-6 shadow-sm"
            onClick={handleSendSingleEmail}
            disabled={isSingleEmailSending}
          >
            {isSingleEmailSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                Sending email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Send via email
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for Downloading All Summaries */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-xl border-border dark:border-slate-800 shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-lg font-bold">
              Download All Summaries
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to download all invigilators&apos; summaries?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsConfirmOpen(false);
                handleDownloadAll();
              }}
              className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg shadow-sm"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Sending Email to All Invigilators */}
      <AlertDialog open={isBulkEmailConfirmOpen} onOpenChange={setIsBulkEmailConfirmOpen}>
        <AlertDialogContent className="rounded-xl border-border dark:border-slate-800 shadow-xl max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="font-headline text-lg font-bold">
                Send Email to All Invigilators
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-3 pt-1 text-left">
                <p>
                  Are you sure you want to send duty summaries via email to all{' '}
                  <strong className="text-foreground">{invigilators.length}</strong> invigilators?
                </p>
                <div className="bg-muted/50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/60 text-xs text-foreground space-y-1.5 text-left">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Email Message Preview
                  </div>
                  <p className="italic text-muted-foreground">
                    &ldquo;Greetings! [Invigilator Name], Your examination duties have been assigned. Please find the attached Duty Summary for your reference. Regards DutyFlow&rdquo;
                  </p>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    📎 Each invigilator will receive their respective individual duty summary PDF page as an attachment.
                  </div>
                </div>

                {invigilators.some(inv => !inv.email || !inv.email.includes('@')) && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 p-2.5 rounded-lg text-xs text-left">
                    ⚠️ <strong>Note:</strong> {invigilators.filter(inv => !inv.email || !inv.email.includes('@')).length} invigilator(s) without a valid email address will be skipped.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteBulkEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
            >
              <Send className="mr-1.5 h-4 w-4" /> Yes, Send Emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubscriptionDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
        category="individual_profile"
        customMessage={customSubscriptionMessage}
      />

      {/* Pop-up Dialog stating Email Sent */}
      <Dialog
        open={emailSuccessDialog.open}
        onOpenChange={(open) => setEmailSuccessDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
          <div className="h-[3px] w-full bg-gradient-to-r from-[#6342e8] via-[#8b5cf6] to-[#10b981]" />
          <div className="p-6 sm:p-7 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs ring-8 ring-emerald-50/50 dark:ring-emerald-950/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-headline font-bold text-slate-900 dark:text-white">
                {emailSuccessDialog.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                {emailSuccessDialog.message}
              </DialogDescription>
            </div>

            {emailSuccessDialog.recipient && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-[#6342e8] shrink-0" />
                <span className="truncate">{emailSuccessDialog.recipient}</span>
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={() => setEmailSuccessDialog(prev => ({ ...prev, open: false }))}
                className="w-full bg-[#6342e8] hover:bg-[#5232d6] text-white font-semibold rounded-xl h-10 shadow-xs"
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
