/**
 * Room Attendance Publishing Service
 * Manages publishing state of examination rooms for Invigilator Attendance
 * Enforces exclusivity & conflict prevention between Invigilator Portal and Admin Attendance
 */

const STORAGE_KEY_PREFIX = 'dutyflow_room_publishing_';

function getStorageKey(institutionId?: string): string {
  const scope = institutionId || 'guest-session';
  return `${STORAGE_KEY_PREFIX}${scope}`;
}

export function getRoomPublishMap(institutionId?: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const key = getStorageKey(institutionId);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
    // Check fallback for guest
    if (!institutionId || institutionId === 'guest-session') {
      const guestRaw = localStorage.getItem('dutyflow_guest_room_publishing');
      if (guestRaw) return JSON.parse(guestRaw);
    }
    return {};
  } catch (_) {
    return {};
  }
}

export function isRoomPublished(
  roomNo: string,
  examId?: string,
  institutionId?: string
): boolean {
  if (!roomNo) return false;
  const map = getRoomPublishMap(institutionId);
  const cleanRoom = String(roomNo).trim();
  
  // Check composite key first (examId + roomNo)
  if (examId) {
    const compositeKey = `${examId}_${cleanRoom}`;
    if (map[compositeKey] !== undefined) {
      return Boolean(map[compositeKey]);
    }
  }

  // Fallback to roomNo key
  if (map[cleanRoom] !== undefined) {
    return Boolean(map[cleanRoom]);
  }

  // Demo fallback for room 108 if not explicitly set
  if (cleanRoom === '108') {
    return true;
  }

  // Default: Unpublished (false)
  return false;
}

export function setRoomPublishStatus(
  roomNo: string,
  isPublished: boolean,
  examId?: string,
  institutionId?: string
): void {
  if (typeof window === 'undefined' || !roomNo) return;
  try {
    const cleanRoom = String(roomNo).trim();
    const map = getRoomPublishMap(institutionId);
    
    if (examId) {
      map[`${examId}_${cleanRoom}`] = isPublished;
    }
    map[cleanRoom] = isPublished;

    const key = getStorageKey(institutionId);
    localStorage.setItem(key, JSON.stringify(map));
    if (!institutionId || institutionId === 'guest-session') {
      localStorage.setItem('dutyflow_guest_room_publishing', JSON.stringify(map));
    }

    window.dispatchEvent(
      new CustomEvent('dutyflow:room-publishing-changed', {
        detail: { roomNo: cleanRoom, examId, isPublished },
      })
    );
  } catch (_) {}
}

export function publishAllRooms(
  roomNos: string[],
  examId?: string,
  institutionId?: string
): void {
  if (typeof window === 'undefined' || !roomNos?.length) return;
  try {
    const map = getRoomPublishMap(institutionId);
    roomNos.forEach((roomNo) => {
      const cleanRoom = String(roomNo).trim();
      if (examId) {
        map[`${examId}_${cleanRoom}`] = true;
      }
      map[cleanRoom] = true;
    });

    const key = getStorageKey(institutionId);
    localStorage.setItem(key, JSON.stringify(map));
    if (!institutionId || institutionId === 'guest-session') {
      localStorage.setItem('dutyflow_guest_room_publishing', JSON.stringify(map));
    }

    window.dispatchEvent(
      new CustomEvent('dutyflow:room-publishing-changed', {
        detail: { roomNos, examId, isPublished: true },
      })
    );
  } catch (_) {}
}

export function unpublishAllRooms(
  roomNos: string[],
  examId?: string,
  institutionId?: string
): void {
  if (typeof window === 'undefined' || !roomNos?.length) return;
  try {
    const map = getRoomPublishMap(institutionId);
    roomNos.forEach((roomNo) => {
      const cleanRoom = String(roomNo).trim();
      if (examId) {
        map[`${examId}_${cleanRoom}`] = false;
      }
      map[cleanRoom] = false;
    });

    const key = getStorageKey(institutionId);
    localStorage.setItem(key, JSON.stringify(map));
    if (!institutionId || institutionId === 'guest-session') {
      localStorage.setItem('dutyflow_guest_room_publishing', JSON.stringify(map));
    }

    window.dispatchEvent(
      new CustomEvent('dutyflow:room-publishing-changed', {
        detail: { roomNos, examId, isPublished: false },
      })
    );
  } catch (_) {}
}
