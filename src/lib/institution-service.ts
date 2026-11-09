import { supabase } from './supabase';

export interface InstitutionInfo {
  institutionId: string; // Internal Institution ID (UUID or unique internal identifier)
  institutionCode: string; // User-facing 3-digit Code (e.g. '001')
  institutionName: string;
  email?: string;
}

export interface StoredInstitutionRegistryItem {
  code: string;
  email: string;
  institutionId: string;
  institutionName: string;
  createdAt: string;
  updatedAt?: string;
}

const REGISTRY_STORAGE_KEY = 'dutyflow_institution_code_registry';

/**
 * Validates whether the given string is a valid 3-digit Institution Code (001 - 999)
 */
export function isValidInstitutionCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^\d{3}$/.test(code.trim());
}

/**
 * Formats a code or number into a standard 3-digit string ('001', '002', etc.)
 */
export function formatInstitutionCode(val: string | number | null | undefined): string {
  if (!val) return '001';
  const clean = String(val).trim().replace(/\D/g, '');
  if (!clean) return '001';
  const num = parseInt(clean, 10);
  if (isNaN(num) || num <= 0) return '001';
  return String(num).padStart(3, '0');
}

/**
 * Retrieves the local institution code registry from localStorage
 */
export function getLocalInstitutionRegistry(): Record<string, StoredInstitutionRegistryItem> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * Saves the local institution code registry to localStorage
 */
export function saveLocalInstitutionRegistry(registry: Record<string, StoredInstitutionRegistryItem>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch (_) {}
}

/**
 * Resolves an institution by its user-facing 3-digit Institution Code ('001' - '999').
 * Verifies identity via Supabase RPC, falling back to direct table lookup and permanent local registry.
 */
export async function resolveInstitutionByCode(rawCode: string): Promise<InstitutionInfo | null> {
  const cleanCode = (rawCode || '').trim();
  if (!cleanCode) return null;
  const formattedCode = cleanCode.length <= 3 ? cleanCode.padStart(3, '0') : cleanCode;

  // 1. Try Supabase RPC resolve_institution_by_code
  try {
    const { data, error } = await supabase.rpc('resolve_institution_by_code', {
      p_code: formattedCode,
    });

    if (!error && data && data.valid && data.institution_id) {
      const info: InstitutionInfo = {
        institutionId: String(data.institution_id),
        institutionCode: String(data.institution_code || formattedCode),
        institutionName: String(data.institution_name || 'Institution'),
        email: data.institution_email,
      };
      // Cache in local registry
      registerLocalInstitution(info.institutionCode, info.institutionId, info.email || '', info.institutionName);
      return info;
    }
  } catch (_) {
    // Continue to direct table lookup
  }

  // 2. Direct Supabase Table lookup
  try {
    const { data, error } = await supabase
      .from('institution_code_registry')
      .select('institution_code, institution_id, institution_name, institution_email')
      .eq('institution_code', formattedCode)
      .maybeSingle();

    if (!error && data && data.institution_id) {
      const info: InstitutionInfo = {
        institutionId: String(data.institution_id),
        institutionCode: String(data.institution_code || formattedCode),
        institutionName: String(data.institution_name || 'Institution'),
        email: data.institution_email,
      };
      registerLocalInstitution(info.institutionCode, info.institutionId, info.email || '', info.institutionName);
      return info;
    }
  } catch (_) {
    // Continue to local registry
  }

  // 3. Check local registry
  const registry = getLocalInstitutionRegistry();
  for (const item of Object.values(registry)) {
    if (item.code === formattedCode) {
      return {
        institutionId: item.institutionId,
        institutionCode: item.code,
        institutionName: item.institutionName || 'Institution',
        email: item.email,
      };
    }
  }

  // 4. Check profiles in local storage / guest profile
  if (typeof window !== 'undefined') {
    try {
      const guestRaw = localStorage.getItem('dutyflow_guest_profile');
      if (guestRaw) {
        const guest = JSON.parse(guestRaw);
        if (
          guest &&
          (guest.institution_code === formattedCode || (formattedCode === '001' && !guest.institution_code))
        ) {
          const name = guest.institution_name && guest.institution_name !== 'Guest Profile'
            ? guest.institution_name
            : 'Seshadripuram Independent PU College';
          return {
            institutionId: guest.id || 'guest-session',
            institutionCode: formattedCode,
            institutionName: name,
            email: guest.email,
          };
        }
      }
    } catch (_) {}
  }

  // 5. Default fallback for standard Demo Code '001'
  if (formattedCode === '001') {
    return {
      institutionId: 'guest-session',
      institutionCode: '001',
      institutionName: 'Seshadripuram Independent PU College',
      email: 'admin@dutyflow.in',
    };
  }

  return null;
}

/**
 * Ensures an institution has a permanent record in the public.institution_code_registry table.
 * If the record is missing, it creates it immediately using the provided or assigned code.
 */
export async function ensureInstitutionCodeRegistryRecord(
  institutionId: string,
  email: string,
  institutionName: string,
  desiredCode?: string
): Promise<string> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (institutionName || '').trim() || 'Institution';
  if (!cleanEmail || !institutionId || institutionId === 'guest-session') {
    return formatInstitutionCode(desiredCode || '001');
  }

  // 1. Check if row exists by email in Supabase
  try {
    const { data: existing, error } = await supabase
      .from('institution_code_registry')
      .select('institution_code, institution_id, institution_name')
      .eq('institution_email', cleanEmail)
      .maybeSingle();

    if (!error && existing && existing.institution_code) {
      registerLocalInstitution(existing.institution_code, institutionId, cleanEmail, cleanName);
      return existing.institution_code;
    }
  } catch (_) {}

  // 2. Row does not exist by email, determine next code or use desiredCode
  let codeToUse = desiredCode ? formatInstitutionCode(desiredCode) : '';
  if (!codeToUse || codeToUse === '001') {
    try {
      const { data: rows } = await supabase
        .from('institution_code_registry')
        .select('institution_code')
        .order('institution_code', { ascending: false })
        .limit(20);

      let maxNum = 0;
      if (rows && rows.length > 0) {
        for (const r of rows) {
          const n = parseInt(r.institution_code, 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      codeToUse = String(maxNum + 1).padStart(3, '0');
    } catch (_) {
      codeToUse = '001';
    }
  }

  // 3. Insert into Supabase institution_code_registry
  try {
    const { error: insertErr } = await supabase
      .from('institution_code_registry')
      .insert({
        institution_code: codeToUse,
        institution_name: cleanName,
        institution_email: cleanEmail,
        institution_id: institutionId,
      });

    if (!insertErr) {
      registerLocalInstitution(codeToUse, institutionId, cleanEmail, cleanName);
      return codeToUse;
    }
  } catch (_) {}

  registerLocalInstitution(codeToUse, institutionId, cleanEmail, cleanName);
  return codeToUse;
}

/**
 * Automatically assigns or reinstates a permanent 3-digit Institution Code for an institution.
 * Adheres strictly to the Reinstatement Rule: If the email was previously registered,
 * the original Institution Code is reinstated.
 */
export async function getOrCreateInstitutionCode(
  email: string,
  institutionId: string,
  institutionName?: string
): Promise<string> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (institutionName || '').trim() || 'Institution';

  // 1. Try Supabase RPC first
  if (institutionId && institutionId !== 'guest-session') {
    try {
      const { data, error } = await supabase.rpc('get_or_create_institution_code', {
        p_email: cleanEmail,
        p_institution_id: institutionId,
        p_institution_name: cleanName,
      });

      if (!error && typeof data === 'string' && data.length > 0) {
        registerLocalInstitution(data, institutionId, cleanEmail, cleanName);
        return data;
      }
    } catch (_) {
      // Continue to direct table fallback
    }
  }

  // 2. Direct Supabase Table Check & Insert
  if (institutionId && institutionId !== 'guest-session' && cleanEmail) {
    try {
      const assigned = await ensureInstitutionCodeRegistryRecord(
        institutionId,
        cleanEmail,
        cleanName
      );
      if (assigned) return assigned;
    } catch (_) {}
  }

  // 3. Local Registry Allocation with permanent reinstatement rule
  const registry = getLocalInstitutionRegistry();

  // Reinstatement rule: check if email was previously registered
  for (const item of Object.values(registry)) {
    if (item.email && item.email.toLowerCase() === cleanEmail) {
      // Reinstate original code!
      item.institutionId = institutionId;
      item.institutionName = cleanName;
      item.updatedAt = new Date().toISOString();
      saveLocalInstitutionRegistry(registry);
      return item.code;
    }
  }

  // Allocate next sequential 3-digit code starting from 001
  let maxCodeNum = 0;
  for (const item of Object.values(registry)) {
    const num = parseInt(item.code, 10);
    if (!isNaN(num) && num > maxCodeNum) {
      maxCodeNum = num;
    }
  }

  const nextCodeNum = maxCodeNum + 1;
  const newCode = String(nextCodeNum).padStart(3, '0');

  registry[newCode] = {
    code: newCode,
    email: cleanEmail,
    institutionId,
    institutionName: cleanName,
    createdAt: new Date().toISOString(),
  };

  saveLocalInstitutionRegistry(registry);
  return newCode;
}

/**
 * Registers or updates an institution record in the local registry
 */
export function registerLocalInstitution(
  code: string,
  institutionId: string,
  email: string,
  institutionName: string
): void {
  const cleanCode = formatInstitutionCode(code);
  const registry = getLocalInstitutionRegistry();

  registry[cleanCode] = {
    code: cleanCode,
    email: (email || registry[cleanCode]?.email || '').toLowerCase(),
    institutionId: institutionId || registry[cleanCode]?.institutionId || 'guest-session',
    institutionName: institutionName || registry[cleanCode]?.institutionName || 'Institution',
    createdAt: registry[cleanCode]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveLocalInstitutionRegistry(registry);
}
