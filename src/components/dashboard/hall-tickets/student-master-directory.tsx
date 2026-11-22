"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudentMasterProfile, StudentStream, StudentGender } from '@/lib/student-master-types';
import {
  getStudentMasterProfiles,
  saveStudentMasterProfiles,
  upsertStudentProfile,
  deleteStudentProfile,
  bulkMapStudentPhotos,
  parseStudentDirectoryExcel,
  downloadStudentDirectoryTemplate,
  exportStudentDirectoryToExcel,
} from '@/lib/student-master-service';
import { getInvigilatorInitial, cn } from '@/lib/utils';
import { getClassBadgeStyle } from '@/lib/student-seating-colors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Camera,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List,
  GraduationCap,
  Sparkles,
  Image as ImageIcon,
  Check,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';

interface StudentMasterDirectoryProps {
  onGenerateForStudent?: (student: StudentMasterProfile) => void;
  onNavigateToGenerator?: () => void;
}

export function StudentMasterDirectory({
  onGenerateForStudent,
  onNavigateToGenerator,
}: StudentMasterDirectoryProps) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<StudentMasterProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterStream, setFilterStream] = useState<string>('ALL');
  const [filterCombination, setFilterCombination] = useState<string>('ALL');
  const [filterPhoto, setFilterPhoto] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Single Student Add/Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<StudentMasterProfile> | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentMasterProfile | null>(null);

  // Bulk Excel Upload Modal
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    valid: StudentMasterProfile[];
    errors: { row: number; reason: string }[];
  } | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Bulk Photo Upload Modal
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<{ fileName: string; dataUrl: string }[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoMatchSummary, setPhotoMatchSummary] = useState<{
    matched: string[];
    unmatched: string[];
  } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load profiles on mount
  const loadDirectory = async () => {
    setIsLoading(true);
    try {
      const data = await getStudentMasterProfiles();
      setProfiles(data);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load directory',
        description: err.message || 'Could not load student master profiles.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();

    const handleUpdate = () => loadDirectory();
    window.addEventListener('dutyflow:student-directory-updated', handleUpdate);
    return () => window.removeEventListener('dutyflow:student-directory-updated', handleUpdate);
  }, []);

  // Compute Unique Options for Dropdowns
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.className) set.add(p.className.trim());
    });
    return Array.from(set).sort();
  }, [profiles]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.stream) set.add(p.stream.trim());
    });
    return Array.from(set).sort();
  }, [profiles]);

  const availableCombinations = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.combination) set.add(p.combination.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [profiles]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = profiles.length;
    const withPhoto = profiles.filter((p) => Boolean(p.photoUrl)).length;
    const missingPhoto = total - withPhoto;
    const photoPercentage = total > 0 ? Math.round((withPhoto / total) * 100) : 0;

    return { total, withPhoto, missingPhoto, photoPercentage };
  }, [profiles]);

  // Filtered List
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const regMatch = p.registerNumber.toLowerCase().includes(q);
        const satsMatch = (p.satsNumber || '').toLowerCase().includes(q);
        const fatherMatch = (p.fatherName || '').toLowerCase().includes(q);
        if (!nameMatch && !regMatch && !satsMatch && !fatherMatch) return false;
      }

      // 2. Class filter
      if (filterClass !== 'ALL' && p.className !== filterClass) return false;

      // 3. Stream filter
      if (filterStream !== 'ALL' && p.stream !== filterStream) return false;

      // 4. Combination filter
      if (filterCombination !== 'ALL' && p.combination.toUpperCase() !== filterCombination.toUpperCase()) return false;

      // 5. Photo filter
      if (filterPhoto === 'WITH_PHOTO' && !p.photoUrl) return false;
      if (filterPhoto === 'NO_PHOTO' && p.photoUrl) return false;

      return true;
    });
  }, [profiles, searchQuery, filterClass, filterStream, filterCombination, filterPhoto]);

  // Handle Save Single Student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.name?.trim() || !editingStudent?.registerNumber?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required fields missing',
        description: 'Student Full Name and Register Number are mandatory.',
      });
      return;
    }

    const payload: StudentMasterProfile = {
      id: editingStudent.id || `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: editingStudent.name.trim(),
      registerNumber: editingStudent.registerNumber.trim().toUpperCase(),
      satsNumber: editingStudent.satsNumber?.trim() || undefined,
      className: editingStudent.className?.trim() || '1PUC',
      stream: editingStudent.stream || 'Science',
      combination: (editingStudent.combination || 'PCMB').trim().toUpperCase(),
      dob: editingStudent.dob?.trim() || undefined,
      gender: editingStudent.gender || 'Male',
      fatherName: editingStudent.fatherName?.trim() || undefined,
      photoUrl: editingStudent.photoUrl || undefined,
      createdAt: editingStudent.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = await upsertStudentProfile(payload);
    setProfiles(updated);
    setIsEditModalOpen(false);
    setEditingStudent(null);
    toast({
      title: 'Profile Saved',
      description: `Student ${payload.name} (${payload.registerNumber}) saved successfully.`,
    });
  };

  // Handle Single Student Photo Upload
  const handleSinglePhotoUpload = (student: StudentMasterProfile, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const updatedStudent = { ...student, photoUrl: dataUrl };
      const updated = await upsertStudentProfile(updatedStudent);
      setProfiles(updated);
      toast({
        title: 'Photo Uploaded',
        description: `Passport photo updated for ${student.name}.`,
      });
    };
    reader.readAsDataURL(file);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    const updated = await deleteStudentProfile(studentToDelete.id);
    setProfiles(updated);
    toast({
      title: 'Student Removed',
      description: `Profile for ${studentToDelete.name} has been deleted.`,
    });
    setStudentToDelete(null);
  };

  // Handle Excel File Selection
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsParsingExcel(true);
    setParsedPreview(null);

    try {
      const res = await parseStudentDirectoryExcel(file);
      setParsedPreview({
        valid: res.validProfiles,
        errors: res.errors,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Parsing Failed',
        description: err.message || 'Could not parse Excel spreadsheet.',
      });
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Confirm Excel Import
  const handleConfirmExcelImport = async () => {
    if (!parsedPreview || parsedPreview.valid.length === 0) return;

    // Merge or replace by Register Number
    const existingMap = new Map<string, StudentMasterProfile>();
    profiles.forEach((p) => existingMap.set(p.registerNumber.toUpperCase(), p));

    parsedPreview.valid.forEach((newP) => {
      const reg = newP.registerNumber.toUpperCase();
      const existing = existingMap.get(reg);
      if (existing) {
        // preserve photo if existing had one and new doesn't
        existingMap.set(reg, {
          ...existing,
          ...newP,
          photoUrl: newP.photoUrl || existing.photoUrl,
          id: existing.id,
        });
      } else {
        existingMap.set(reg, newP);
      }
    });

    const merged = Array.from(existingMap.values());
    await saveStudentMasterProfiles(merged);
    setProfiles(merged);

    toast({
      title: 'Import Successful',
      description: `Imported ${parsedPreview.valid.length} student records into directory.`,
    });

    setIsExcelModalOpen(false);
    setExcelFile(null);
    setParsedPreview(null);
  };

  // Handle Bulk Photos Selection
  const handlePhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessingPhotos(true);
    const converted: { fileName: string; dataUrl: string }[] = [];

    // Process image files to data URLs in parallel
    await Promise.all(
      files.map((f) => {
        return new Promise<void>((resolve) => {
          if (!f.type.startsWith('image/')) {
            resolve();
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            converted.push({
              fileName: f.name,
              dataUrl: reader.result as string,
            });
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(f);
        });
      })
    );

    setPhotoFiles(converted);
    setIsProcessingPhotos(false);
  };

  // Confirm Bulk Photo Mapping
  const handleConfirmBulkPhotos = async () => {
    if (photoFiles.length === 0) return;

    setIsProcessingPhotos(true);
    try {
      const { updatedProfiles, result } = await bulkMapStudentPhotos(photoFiles, profiles);
      setProfiles(updatedProfiles);
      setPhotoMatchSummary({
        matched: result.matchedRegisterNumbers,
        unmatched: result.unmatchedFileNames,
      });

      toast({
        title: 'Photos Processed',
        description: `Successfully mapped ${result.matchedCount} photos to students by Register Number.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Photo Mapping Failed',
        description: err.message || 'Error occurred during photo matching.',
      });
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Students
            </div>
            <div className="font-headline font-black text-2xl text-slate-900 dark:text-white mt-0.5">
              {stats.total.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Directory Headcount</div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-100 dark:border-slate-800">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Passport Photos
            </div>
            <div className="font-headline font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.withPhoto.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {stats.total}</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{stats.photoPercentage}% Attested</div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800">
            <Camera className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Classes Active
            </div>
            <div className="font-headline font-black text-2xl text-indigo-700 dark:text-indigo-400 mt-0.5">
              {availableClasses.length}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[120px]">
              {availableClasses.join(', ') || 'None'}
            </div>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Combinations
            </div>
            <div className="font-headline font-black text-2xl text-purple-700 dark:text-purple-400 mt-0.5">
              {availableCombinations.length}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[120px]">
              {availableCombinations.join(', ') || 'None'}
            </div>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-800">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Action Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Real-time Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, register number, SATS ID, father's name..."
              className="pl-9 h-9 text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-md text-xs font-bold transition-all",
                  viewMode === 'table' ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  "p-1.5 rounded-md text-xs font-bold transition-all",
                  viewMode === 'cards' ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Bulk Upload Excel */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExcelFile(null);
                setParsedPreview(null);
                setIsExcelModalOpen(true);
              }}
              className="h-9 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Import Excel / CSV
            </Button>

            {/* Bulk Upload Photos */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPhotoFiles([]);
                setPhotoMatchSummary(null);
                setIsPhotoModalOpen(true);
              }}
              className="h-9 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Bulk Photos Upload
            </Button>

            {/* Export Excel */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportStudentDirectoryToExcel(filteredProfiles)}
              disabled={filteredProfiles.length === 0}
              className="h-9 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>

            {/* Add Student Button */}
            <Button
              size="sm"
              onClick={() => {
                setEditingStudent({
                  name: '',
                  registerNumber: '',
                  className: availableClasses[0] || '1PUC',
                  stream: 'Science',
                  combination: 'PCMB',
                  gender: 'Male',
                });
                setIsEditModalOpen(true);
              }}
              className="h-9 text-xs font-bold px-3.5 gap-1.5 bg-[#6342e8] hover:bg-[#5130d8] text-white shadow-md shadow-purple-900/20 ring-2 ring-purple-300/40"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Class</Label>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-1">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {availableClasses.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Stream</Label>
            <Select value={filterStream} onValueChange={setFilterStream}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-1">
                <SelectValue placeholder="All Streams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Streams</SelectItem>
                {availableStreams.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Combination</Label>
            <Select value={filterCombination} onValueChange={setFilterCombination}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-1">
                <SelectValue placeholder="All Combinations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Combinations</SelectItem>
                {availableCombinations.map((cb) => (
                  <SelectItem key={cb} value={cb}>{cb}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] font-bold text-slate-400 uppercase">Photo Status</Label>
            <Select value={filterPhoto} onValueChange={(v: any) => setFilterPhoto(v)}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-1">
                <SelectValue placeholder="All Photo Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Photo Status</SelectItem>
                <SelectItem value="WITH_PHOTO">With Photo Only</SelectItem>
                <SelectItem value="NO_PHOTO">Missing Photo Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Directory Content (Table or Cards View) */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">No Students Found</div>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {searchQuery || filterClass !== 'ALL' || filterStream !== 'ALL'
              ? 'No student profiles matched the active filters. Try clearing filters or search terms.'
              : 'Your Student Master Directory is currently empty. Add students or import an Excel sheet to get started.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Showing {filteredProfiles.length} of {profiles.length} Students
            </span>
            {onNavigateToGenerator && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToGenerator}
                className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-bold h-7 gap-1"
              >
                Go to Hall Ticket Generation &rarr;
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3 w-14 text-center">Photo</th>
                  <th className="py-3 px-3 min-w-[180px]">Student Details</th>
                  <th className="py-3 px-3 min-w-[140px]">Register No & SATS</th>
                  <th className="py-3 px-3 min-w-[100px]">Class</th>
                  <th className="py-3 px-3 min-w-[130px]">Stream & Comb.</th>
                  <th className="py-3 px-3 min-w-[110px]">DOB & Gender</th>
                  <th className="py-3 px-3 text-center">Photo Status</th>
                  <th className="py-3 px-4 text-center w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium text-slate-700 dark:text-slate-200">
                {filteredProfiles.map((student, idx) => {
                  const classStyle = getClassBadgeStyle(student.className);
                  const initial = getInvigilatorInitial(student.name);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* # */}
                      <td className="py-3 px-3 text-center text-slate-400 dark:text-slate-500 font-bold text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="relative inline-block">
                          {student.photoUrl && student.photoUrl.startsWith('data:image') ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-10 h-12 object-cover rounded-md border border-slate-300 dark:border-slate-700 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-headline font-black text-base shadow-2xs select-none">
                              {initial}
                            </div>
                          )}

                          {/* Quick Photo Upload Trigger */}
                          <label
                            className="absolute -bottom-1.5 -right-1.5 p-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer"
                            title="Upload/Replace Photo"
                          >
                            <Camera className="w-2.5 h-2.5" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleSinglePhotoUpload(student, f);
                              }}
                            />
                          </label>
                        </div>
                      </td>

                      {/* Student Details */}
                      <td className="py-3 px-3">
                        <div className="font-headline font-black text-xs text-slate-900 dark:text-white leading-snug">
                          {student.name}
                        </div>
                        {student.fatherName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            Father: {student.fatherName}
                          </div>
                        )}
                      </td>

                      {/* Register No & SATS */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-xs text-indigo-900 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 inline-block">
                          {student.registerNumber}
                        </div>
                        {student.satsNumber && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            SATS: {student.satsNumber}
                          </div>
                        )}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold shadow-2xs",
                            classStyle.badgeClass
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", classStyle.dotColor)} />
                          <span>{student.className}</span>
                        </span>
                      </td>

                      {/* Stream & Combination */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{student.stream}</div>
                        <Badge
                          variant="secondary"
                          className="bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-black mt-0.5 tracking-wider"
                        >
                          {student.combination}
                        </Badge>
                      </td>

                      {/* DOB & Gender */}
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-semibold">{student.dob || '—'}</div>
                        <div className="text-[11px] text-slate-400">{student.gender || '—'}</div>
                      </td>

                      {/* Photo Status */}
                      <td className="py-3 px-3 text-center">
                        {student.photoUrl ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1 inline-flex items-center"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Attested
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold"
                          >
                            No Photo
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onGenerateForStudent && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onGenerateForStudent(student)}
                              className="h-7 text-[11px] font-bold px-2 gap-1 text-[#1E2A5E] hover:bg-indigo-50 border-slate-200"
                              title="Generate Hall Ticket for this candidate"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              Hall Ticket
                            </Button>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingStudent(student);
                              setIsEditModalOpen(true);
                            }}
                            className="h-7 w-7 text-slate-600 hover:bg-slate-100"
                            title="Edit Student Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setStudentToDelete(student)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProfiles.map((student) => {
            const classStyle = getClassBadgeStyle(student.className);
            const initial = getInvigilatorInitial(student.name);

            return (
              <div
                key={student.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between space-y-3.5"
              >
                <div className="flex items-start gap-3">
                  {/* Photo Box */}
                  <div className="shrink-0 relative">
                    {student.photoUrl && student.photoUrl.startsWith('data:image') ? (
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        className="w-14 h-16 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs"
                      />
                    ) : (
                      <div className="w-14 h-16 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-headline font-black text-xl shadow-2xs select-none">
                        {initial}
                      </div>
                    )}
                    <label
                      className="absolute -bottom-1.5 -right-1.5 p-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer"
                      title="Upload Photo"
                    >
                      <Camera className="w-2.5 h-2.5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleSinglePhotoUpload(student, f);
                        }}
                      />
                    </label>
                  </div>

                  {/* Top Details */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-headline font-black text-xs text-slate-900 dark:text-white truncate" title={student.name}>
                      {student.name}
                    </h3>
                    <div className="font-mono font-bold text-[11px] text-indigo-800 dark:text-indigo-300 mt-0.5">
                      {student.registerNumber}
                    </div>
                    {student.satsNumber && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        SATS: {student.satsNumber}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                          classStyle.badgeClass
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", classStyle.dotColor)} />
                        {student.className}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-black py-0 px-1.5"
                      >
                        {student.combination}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Stream:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{student.stream}</span>
                  </div>
                  {student.fatherName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Father:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{student.fatherName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">DOB / Gender:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{student.dob || '—'} ({student.gender?.[0] || '—'})</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  {onGenerateForStudent ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onGenerateForStudent(student)}
                      className="h-7 text-[11px] font-bold px-2 gap-1 text-[#1E2A5E] dark:text-indigo-300 border-slate-200 dark:border-slate-700"
                    >
                      <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      Hall Ticket
                    </Button>
                  ) : <div />}

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingStudent(student);
                        setIsEditModalOpen(true);
                      }}
                      className="h-7 w-7 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setStudentToDelete(student)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add / Edit Student Profile Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditModalOpen(false);
            setEditingStudent(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
              {editingStudent?.id ? 'Edit Student Profile' : 'Add New Student'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Manage student candidate credentials, combinations, and passport photo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStudent} className="space-y-4 py-2">
            {/* Passport Photo Upload Zone in Form */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="relative shrink-0">
                {editingStudent?.photoUrl ? (
                  <img
                    src={editingStudent.photoUrl}
                    alt="Preview"
                    className="w-16 h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-20 rounded-lg bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <Camera className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    <span className="text-[9px] mt-1 font-semibold">Photo</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Passport Photograph</Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Upload recent passport size photo (JPG, PNG). Appears on candidate hall ticket.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold gap-1"
                    onClick={() => {
                      const inp = document.getElementById('single-modal-photo-input') as HTMLInputElement;
                      inp?.click();
                    }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {editingStudent?.photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {editingStudent?.photoUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingStudent({ ...editingStudent, photoUrl: undefined })}
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50 px-2"
                    >
                      Remove
                    </Button>
                  )}
                  <input
                    id="single-modal-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setEditingStudent({ ...editingStudent, photoUrl: reader.result as string });
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold text-slate-700">
                  Candidate Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. Aarav Patel"
                  value={editingStudent?.name || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Register Number / Roll No <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. 24PU0101"
                  value={editingStudent?.registerNumber || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, registerNumber: e.target.value })}
                  className="text-xs font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">SATS ID / Admission No</Label>
                <Input
                  placeholder="e.g. SATS10884920"
                  value={editingStudent?.satsNumber || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, satsNumber: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Class</Label>
                <Input
                  placeholder="e.g. 1PUC, 2PUC"
                  value={editingStudent?.className || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, className: e.target.value })}
                  className="text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Stream</Label>
                <Select
                  value={editingStudent?.stream || 'Science'}
                  onValueChange={(v) => setEditingStudent({ ...editingStudent, stream: v })}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue placeholder="Stream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Commerce">Commerce</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold text-slate-700">Subject Combination</Label>
                <Input
                  placeholder="e.g. PCMB, PCMC, CEBA, HEBA"
                  value={editingStudent?.combination || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, combination: e.target.value.toUpperCase() })}
                  className="text-xs font-bold uppercase tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Date of Birth</Label>
                <Input
                  type="date"
                  value={editingStudent?.dob || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Gender</Label>
                <Select
                  value={editingStudent?.gender || 'Male'}
                  onValueChange={(v) => setEditingStudent({ ...editingStudent, gender: v as StudentGender })}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold text-slate-700">Father&apos;s / Parent&apos;s Name</Label>
                <Input
                  placeholder="e.g. Rajesh Patel"
                  value={editingStudent?.fatherName || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingStudent(null);
                }}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5"
              >
                Save Student Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Bulk Excel Upload Modal */}
      <Dialog open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                  Bulk Import Student Directory
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Upload an Excel or CSV file containing student master profiles.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Template Download Help Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold">Need sample format?</span> Download our pre-formatted template with standard headers.
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={downloadStudentDirectoryTemplate}
                className="h-8 text-xs font-bold gap-1 shrink-0 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                Template (.xlsx)
              </Button>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => excelInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-all rounded-xl p-6 text-center cursor-pointer space-y-2"
            >
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileSelect}
                className="hidden"
              />
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {excelFile ? excelFile.name : 'Click to browse or drop student Excel/CSV roster'}
              </div>
              <p className="text-[11px] text-slate-400">
                Expected columns: Name, Register Number, SATS ID, Class, Stream, Combination, DOB, Gender, Father Name
              </p>
            </div>

            {isParsingExcel && (
              <div className="py-4 text-center space-y-1">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
                <div className="text-xs font-bold text-slate-700">Validating spreadsheet columns...</div>
              </div>
            )}

            {parsedPreview && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Validation Results:</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                      {parsedPreview.valid.length} Valid Profiles
                    </Badge>
                    {parsedPreview.errors.length > 0 && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">
                        {parsedPreview.errors.length} Row Warnings
                      </Badge>
                    )}
                  </div>
                </div>

                {parsedPreview.valid.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="py-1.5 px-2">Reg No</th>
                          <th className="py-1.5 px-3">Name</th>
                          <th className="py-1.5 px-2">Class</th>
                          <th className="py-1.5 px-2">Comb</th>
                          <th className="py-1.5 px-2">Father Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parsedPreview.valid.slice(0, 10).map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-mono font-bold text-indigo-700">{p.registerNumber}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{p.name}</td>
                            <td className="py-1.5 px-2">{p.className}</td>
                            <td className="py-1.5 px-2 font-bold">{p.combination}</td>
                            <td className="py-1.5 px-2 text-slate-500">{p.fatherName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExcelModalOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmExcelImport}
              disabled={!parsedPreview || parsedPreview.valid.length === 0}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-5"
            >
              Confirm Import ({parsedPreview?.valid.length || 0} Students)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Bulk Photo Upload Modal with Register Number Matching */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded-lg">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                  Bulk Upload Passport Photos
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Automatically match and embed photos into student profiles by matching file name with Register Number.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Instruction Banner */}
            <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 rounded-xl p-3 text-xs text-purple-950 dark:text-purple-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-purple-900 dark:text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                Automatic Register Number Matching
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                Name your image files using each student&apos;s Register Number (e.g., <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">24PU0101.jpg</code> or <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white">24PU0102.png</code>). DutyFlow will automatically map each photo to the correct student profile.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => photoInputRef.current?.click()}
              className="border-2 border-dashed border-purple-200 dark:border-purple-800/80 hover:border-purple-400 dark:hover:border-purple-600 bg-purple-50/30 dark:bg-purple-950/20 hover:bg-purple-50/60 dark:hover:bg-purple-950/40 transition-all rounded-xl p-6 text-center cursor-pointer space-y-2"
            >
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handlePhotosSelect}
                className="hidden"
              />
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {photoFiles.length > 0 ? `${photoFiles.length} photos selected` : 'Click to select multiple student photos'}
              </div>
              <p className="text-[11px] text-slate-400">
                You can select dozens or hundreds of photos at once (JPG, PNG, WebP)
              </p>
            </div>

            {isProcessingPhotos && (
              <div className="py-4 text-center space-y-1">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-600 mx-auto" />
                <div className="text-xs font-bold text-slate-700">Scanning and matching photos with Register Numbers...</div>
              </div>
            )}

            {photoFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Selected Photos ({photoFiles.length})</span>
                  <span className="text-[11px] text-slate-400 font-normal">Ready to match</span>
                </div>

                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                  {photoFiles.slice(0, 24).map((f, i) => (
                    <div key={i} className="text-center space-y-1">
                      <img
                        src={f.dataUrl}
                        alt={f.fileName}
                        className="w-12 h-14 object-cover rounded mx-auto border border-slate-300"
                      />
                      <div className="text-[9px] font-mono truncate text-slate-600" title={f.fileName}>
                        {f.fileName}
                      </div>
                    </div>
                  ))}
                  {photoFiles.length > 24 && (
                    <div className="flex items-center justify-center text-[10px] text-slate-400 font-bold col-span-6 py-2">
                      + {photoFiles.length - 24} more photos ready for mapping
                    </div>
                  )}
                </div>
              </div>
            )}

            {photoMatchSummary && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Successfully Mapped: {photoMatchSummary.matched.length} Photos
                </div>
                {photoMatchSummary.unmatched.length > 0 && (
                  <div className="text-slate-500 text-[11px]">
                    Unmatched file names ({photoMatchSummary.unmatched.length}):{' '}
                    <span className="font-mono text-slate-600">
                      {photoMatchSummary.unmatched.slice(0, 5).join(', ')}
                      {photoMatchSummary.unmatched.length > 5 ? '...' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPhotoModalOpen(false)}
              className="text-xs h-9"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmBulkPhotos}
              disabled={photoFiles.length === 0 || isProcessingPhotos}
              className="bg-[#6342e8] hover:bg-[#5130d8] text-white font-bold text-xs h-9 px-5 gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Map & Save Photos ({photoFiles.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(studentToDelete)}
        onOpenChange={(open) => {
          if (!open) setStudentToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="font-headline text-lg font-bold text-slate-900 dark:text-white">
                Delete Student Profile?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete profile for &ldquo;{studentToDelete?.name}&rdquo; ({studentToDelete?.registerNumber})? This will remove all their credentials and photo from the master directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
