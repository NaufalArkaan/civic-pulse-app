/**
 * Civic Pulse - Modul LBS
 * Spatial Presentation Utility: Distance Formatter
 * Role: Anggota 1 (Lead System Architect & Security Engineer)
 */

/**
 * Memformat jarak dalam meter ke representasi string yang ramah pengguna (Bahasa Indonesia).
 *
 * Aturan format:
 * - null atau negatif: "Menunggu lokasi"
 * - < 1.000 meter: dibulatkan ke bilangan bulat terdekat, contoh "350 m"
 * - >= 1.000 meter: dikonversi ke km dengan 2 desimal (menggunakan koma lokal), contoh "1,25 km"
 *
 * @param meters Jarak dalam meter
 * @returns String format jarak
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters) || meters < 0) {
    return "Menunggu lokasi";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const kilometers = meters / 1000;
  // Format 2 desimal dengan separator koma khas Indonesia
  const formattedKm = kilometers.toFixed(2).replace(".", ",");
  return `${formattedKm} km`;
}

