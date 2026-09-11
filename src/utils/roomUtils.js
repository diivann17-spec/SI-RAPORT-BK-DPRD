export const DEFAULT_ROOMS = [
  { id: 'ROOM-PARIPURNA', name: 'Ruang Rapat Paripurna Abhimata', description: 'Rapat Paripurna DPRD', active: true },
  { id: 'ROOM-BANGGAR', name: 'Ruang Rapat Banggar', description: 'Rapat Badan Anggaran', active: true },
  { id: 'ROOM-VIP', name: 'Ruang Rapat VIP', description: 'Rapat atau Pertemuan Terbatas', active: true },
  { id: 'ROOM-KOMISI-I', name: 'Ruang Rapat Komisi I', description: 'Kegiatan Komisi I', active: true },
  { id: 'ROOM-KOMISI-II', name: 'Ruang Rapat Komisi II', description: 'Kegiatan Komisi II', active: true },
  { id: 'ROOM-KOMISI-III', name: 'Ruang Rapat Komisi III', description: 'Kegiatan Komisi III', active: true },
  { id: 'ROOM-KOMISI-IV', name: 'Ruang Rapat Komisi IV', description: 'Kegiatan Komisi IV', active: true },
  { id: 'ROOM-GABUNGAN', name: 'Ruang Rapat Gabungan', description: 'Rapat Gabungan Komisi/AKD', active: true },
  { id: 'ROOM-PIMPINAN', name: 'Ruang Rapat Pimpinan', description: 'Kegiatan Pimpinan DPRD', active: true },
];

export function hasRoomConflict(activities, candidate, ignoredActivityId = null) {
  return Boolean(findRoomConflict(activities, candidate, ignoredActivityId));
}

export function findRoomConflict(activities, candidate, ignoredActivityId = null) {
  if ((!candidate?.roomId && !candidate?.locationName && !candidate?.roomName) || !candidate.date) return false;
  const start = candidate.startTime || '00:00';
  const end = candidate.endTime || '23:59';
  const candidateRoomId = String(candidate.roomId || '').trim();
  const candidateRoomName = String(candidate.locationName || candidate.roomName || '').trim().toLowerCase();
  return activities.find(activity => {
    const activityRoomId = String(activity.roomId || '').trim();
    const activityRoomName = String(activity.locationName || activity.roomName || '').trim().toLowerCase();
    const sameRoom = (candidateRoomId && activityRoomId && activityRoomId === candidateRoomId)
      || (candidateRoomName && activityRoomName && activityRoomName === candidateRoomName);
    if (activity.id === ignoredActivityId || !sameRoom || activity.date !== candidate.date) return false;
    const otherStart = activity.startTime || '00:00';
    const otherEnd = activity.endTime || '23:59';
    return start < otherEnd && otherStart < end;
  });
}
