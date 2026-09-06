import { supabase } from './supabase';
import type { SavedAllotment, DirectoryInvigilator } from './types';

export interface UserFileRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: 'excel' | 'pdf' | 'zip' | string;
  category: 'upload' | 'download';
  sub_category: 'examinations' | 'invigilators' | 'allotment_sheet' | 'duty_summary' | 'schedule' | 'all_summaries_zip' | string;
  file_size: number;
  mime_type: string;
  public_url?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UploadUserFileOptions {
  file: File | Blob;
  fileName: string;
  fileType: 'excel' | 'pdf' | 'zip';
  category: 'upload' | 'download';
  subCategory: 'examinations' | 'invigilators' | 'allotment_sheet' | 'duty_summary' | 'schedule' | 'all_summaries_zip' | string;
  userId: string;
  metadata?: Record<string, any>;
  mimeType?: string;
}

export const STORAGE_BUCKET = 'dutyflow-files';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(id: string | null | undefined): boolean {
  return Boolean(id && id !== 'guest-session' && UUID_REGEX.test(id));
}

function sanitizeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generate a secure, time-limited signed URL for private user files in Supabase Storage.
 * Valid for 3600 seconds (1 hour).
 */
export async function getSignedDownloadUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL for file:', filePath, error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Exception generating signed download URL:', err);
    return null;
  }
}

/**
 * Uploads a file (Excel, PDF, ZIP) to private Supabase Storage under a user-specific folder
 * and registers metadata in the public.user_files table.
 */
export async function uploadUserFile({
  file,
  fileName,
  fileType,
  category,
  subCategory,
  userId,
  metadata = {},
  mimeType,
}: UploadUserFileOptions): Promise<{ fileRecord: UserFileRecord | null; publicUrl: string | null; error: Error | null }> {
  try {
    if (!userId || !isUUID(userId)) {
      return { fileRecord: null, publicUrl: null, error: new Error('A valid User ID (UUID) is required to save files to cloud storage.') };
    }

    const sanitized = sanitizeFileName(fileName);
    const timestamp = Date.now();
    // Strictly isolate by userId in path: userId/category/subCategory/timestamp_filename
    const filePath = `${userId}/${category}/${subCategory}/${timestamp}_${sanitized}`;

    let detectedMimeType = mimeType || (file as File).type;
    if (!detectedMimeType) {
      if (fileType === 'excel') {
        detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileType === 'pdf') {
        detectedMimeType = 'application/pdf';
      } else if (fileType === 'zip') {
        detectedMimeType = 'application/zip';
      } else {
        detectedMimeType = 'application/octet-stream';
      }
    }

    // 1. Upload to Supabase Storage Bucket under user's private folder
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: detectedMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return { fileRecord: null, publicUrl: null, error: uploadError };
    }

    // 2. Generate secure signed URL
    const signedUrl = await getSignedDownloadUrl(filePath);
    const fileSize = (file as File).size || (file as Blob).size || 0;

    // 3. Insert record in user_files table strictly associated with userId
    const { data: record, error: dbError } = await supabase
      .from('user_files')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        category: category,
        sub_category: subCategory,
        file_size: fileSize,
        mime_type: detectedMimeType,
        public_url: signedUrl,
        metadata: metadata,
      })
      .select('*')
      .maybeSingle();

    if (dbError) {
      console.warn('Warning: Could not write record to user_files table:', dbError);
    }

    return { fileRecord: record, publicUrl: signedUrl, error: null };
  } catch (err: any) {
    console.error('Failed to upload user file:', err);
    return { fileRecord: null, publicUrl: null, error: err };
  }
}

/**
 * Fetch list of files strictly for the specified userId with fresh signed download URLs.
 */
export async function getUserFiles(userId: string, category?: 'upload' | 'download'): Promise<UserFileRecord[]> {
  if (!userId || !isUUID(userId)) return [];

  try {
    let query = supabase
      .from('user_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error('Error fetching user files from Supabase:', error);
      return [];
    }

    // Generate fresh signed URLs for each user file
    const recordsWithSignedUrls = await Promise.all(
      data.map(async (rec: any) => {
        if (rec.file_path) {
          const signedUrl = await getSignedDownloadUrl(rec.file_path);
          return { ...rec, public_url: signedUrl };
        }
        return rec;
      })
    );

    return recordsWithSignedUrls;
  } catch (err) {
    console.error('Error in getUserFiles:', err);
    return [];
  }
}

/**
 * Delete a user file from storage and database strictly matching userId.
 */
export async function deleteUserFile(fileId: string, filePath: string, userId: string): Promise<{ success: boolean; error: Error | null }> {
  if (!userId || !fileId || !isUUID(userId)) {
    return { success: false, error: new Error('User authentication required') };
  }

  // Safety check: ensure file path begins with the user's ID
  if (filePath && !filePath.startsWith(`${userId}/`)) {
    return { success: false, error: new Error('Unauthorized file deletion attempt') };
  }

  try {
    // 1. Remove from storage
    if (filePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    }

    // 2. Remove from database
    const { error: dbError } = await supabase
      .from('user_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (dbError) {
      return { success: false, error: dbError };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Failed to delete user file:', err);
    return { success: false, error: err };
  }
}

/**
 * Sync saved allotment plan to Supabase PostgreSQL database strictly matching userId.
 */
export async function syncAllotmentToDatabase(allotment: SavedAllotment, userId: string): Promise<boolean> {
  if (!userId || !allotment || !isUUID(userId)) return false;

  try {
    const { error } = await supabase.from('saved_allotments').upsert({
      id: allotment.id,
      user_id: userId,
      name: allotment.name,
      status: allotment.status || 'Draft',
      invigilators: allotment.invigilators,
      examinations: allotment.examinations,
      assignments: allotment.assignments,
      created_at: allotment.createdAt instanceof Date ? allotment.createdAt.toISOString() : allotment.createdAt,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error syncing allotment to Supabase database:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in syncAllotmentToDatabase:', err);
    return false;
  }
}

/**
 * Fetch all saved allotments strictly for the specified userId.
 */
export async function fetchUserAllotmentsFromDatabase(userId: string): Promise<SavedAllotment[]> {
  if (!userId || !isUUID(userId)) return [];

  try {
    const { data, error } = await supabase
      .from('saved_allotments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved allotments from Supabase:', error.message || error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      status: row.status || 'Draft',
      invigilators: Array.isArray(row.invigilators) ? row.invigilators : [],
      examinations: Array.isArray(row.examinations) ? row.examinations.map((e: any) => ({
        ...e,
        date: new Date(e.date),
      })) : [],
      assignments: row.assignments || {},
      createdAt: new Date(row.created_at || Date.now()),
    }));
  } catch (err) {
    console.error('Error in fetchUserAllotmentsFromDatabase:', err);
    return [];
  }
}

/**
 * Delete a saved allotment from Supabase PostgreSQL database strictly matching userId.
 */
export async function deleteUserAllotmentFromDatabase(allotmentId: string, userId: string): Promise<boolean> {
  if (!userId || !allotmentId || !isUUID(userId)) return false;

  try {
    const { error } = await supabase
      .from('saved_allotments')
      .delete()
      .eq('id', allotmentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting allotment from database:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in deleteUserAllotmentFromDatabase:', err);
    return false;
  }
}

/**
 * Permanently save the invigilator directory to the user's Supabase account profile.
 */
export async function saveUserDirectoryToCloud(
  directory: DirectoryInvigilator[],
  userId: string
): Promise<{ success: boolean; error?: any }> {
  if (!userId || !isUUID(userId)) return { success: false, error: 'User not authenticated' };

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        invigilator_directory: directory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error saving invigilator directory to profile:', error.message || error);
      return { success: false, error: error.message || error };
    }

    // Also update auth user metadata as cloud backup
    try {
      await supabase.auth.updateUser({
        data: {
          invigilator_directory_count: directory.length,
          invigilator_directory_updated_at: new Date().toISOString(),
        },
      });
    } catch (_) { }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in saveUserDirectoryToCloud:', err);
    return { success: false, error: err };
  }
}

/**
 * Fetch permanently saved invigilator directory for the specified user from Supabase.
 */
export async function fetchUserDirectoryFromCloud(
  userId: string
): Promise<DirectoryInvigilator[] | null> {
  if (!userId || !isUUID(userId)) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('invigilator_directory')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invigilator directory from profile:', error.message || error);
      return null;
    }

    if (data && Array.isArray(data.invigilator_directory)) {
      return data.invigilator_directory;
    }
    return null;
  } catch (err) {
    console.error('Exception in fetchUserDirectoryFromCloud:', err);
    return null;
  }
}

