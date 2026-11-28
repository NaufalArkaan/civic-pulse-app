/**
 * Civic Pulse - Redesign Pertemuan 13
 * Component: ReportItem (Modern Minimalist Real-Time Feed Card)
 * Role: Anggota 2 (Lead Frontend & UI Specialist)
 *
 * Desain Modern & Clean (Mengacu pada Screenshot Referensi):
 * - Card membulat (radius 24dp) dengan shadow sangat halus dan border tipis elegan.
 * - Pill badge kategori dan status penanganan dengan warna pastel harmonis.
 * - Foto laporan ditampilkan sebagai elemen heroik berukuran proporsional (height 175dp, radius 18dp)
 *   tanpa terpotong secara canggung, lengkap dengan placeholder resmi jika belum ada foto.
 * - Tombol aksi alur penanganan berbentuk pill modern yang ramah sentuhan (>= 44dp).
 * - React.memo comparator ketat untuk mempertahankan performa 16ms (60 FPS).
 */

import React, { memo, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { CivicReportCategory, Report, ReportStatus } from "../../types/report";
import {
  getReportPhotoUri,
  isReportDocumentMedia,
  getReportMediaFilename,
} from "../../utils/reportMedia";
import { CivicImage } from "../common/CivicImage";

type ReportItemProps = {
  report: Report;
  onUpdateStatus?: (id: string, newStatus: ReportStatus) => void;
  onPressItem?: (report: Report) => void;
};

const CATEGORY_ICONS: Record<CivicReportCategory, string> = {
  "road-damage": "🚧",
  flood: "🌊",
  landslide: "⚠️",
  "street-light": "💡",
};

const CATEGORY_NAMES: Record<CivicReportCategory, string> = {
  "road-damage": "Jalan Rusak",
  flood: "Banjir / Genangan",
  landslide: "Tanah Longsor",
  "street-light": "Lampu PJU",
};

const STATUS_LABELS: Record<
  ReportStatus,
  { label: string; color: string; bg: string; borderColor: string }
> = {
  submitted: {
    label: "Diajukan",
    color: "#D97706",
    bg: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  verified: {
    label: "Terverifikasi",
    color: "#2563EB",
    bg: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  in_progress: {
    label: "Sedang Diproses",
    color: "#7C3AED",
    bg: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  resolved: {
    label: "Telah Selesai",
    color: "#059669",
    bg: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  rejected: {
    label: "Ditolak",
    color: "#DC2626",
    bg: "#FEF2F2",
    borderColor: "#FECACA",
  },
};

const SEVERITY_INFO: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "Kritis", color: "#DC2626", bg: "#FEE2E2" },
  medium: { label: "Sedang", color: "#D97706", bg: "#FEF3C7" },
  low: { label: "Rendah", color: "#059669", bg: "#DCFCE7" },
};

export const ReportItem = memo(
  function ReportItem({
    report,
    onUpdateStatus,
    onPressItem,
  }: ReportItemProps) {
    const icon = CATEGORY_ICONS[report.category] || "📍";
    const categoryName = CATEGORY_NAMES[report.category] || report.category;
    const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.submitted;
    const severity = SEVERITY_INFO[report.severity] || SEVERITY_INFO.medium;
    const photoUri = getReportPhotoUri(report);
    const isDocument = isReportDocumentMedia(report);
    const docFilename = getReportMediaFilename(report);

    const formattedDate = new Date(report.createdAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isRecentlyCreated =
      Date.now() - new Date(report.createdAt).getTime() < 3 * 60 * 1000;

    const a11yLabel = `Laporan ${categoryName}: ${report.title}. Status: ${statusInfo.label}. Tingkat urgensi: ${severity.label}.`;

    const scale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.985, {
        damping: 15,
        stiffness: 250,
        reduceMotion: ReduceMotion.System,
      });
    }, [scale]);

    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 250,
        reduceMotion: ReduceMotion.System,
      });
    }, [scale]);

    const animatedCardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View style={animatedCardStyle}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPressItem?.(report)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
        >
          {/* 1. Header Badges: Kategori, Status Penanganan & Urgensi */}
          <View style={styles.topRow}>
            <View style={styles.badgeGroup}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryIcon}>{icon}</Text>
                <Text style={styles.categoryName}>{categoryName}</Text>
              </View>

              {isRecentlyCreated && (
                <View style={styles.livePulseBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              )}
            </View>

            <View style={styles.rightBadges}>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusInfo.bg, borderColor: statusInfo.borderColor },
                ]}
              >
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>

              <View style={[styles.severityPill, { backgroundColor: severity.bg }]}>
                <Text style={[styles.severityText, { color: severity.color }]}>
                  {severity.label}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Judul & Deskripsi Laporan */}
          <View style={styles.contentSection}>
            <Text style={styles.title} numberOfLines={2}>
              {report.title}
            </Text>
            {report.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {report.description}
              </Text>
            ) : null}
          </View>

          {/* 3. Hero Photo Showcase Area (Ukuran Konsisten & Proporsional) */}
          <View style={styles.mediaContainer}>
            {isDocument ? (
              <View style={styles.documentCardBox}>
                <View style={styles.documentIconCircle}>
                  <Text style={styles.documentIconText}>📄</Text>
                </View>
                <View style={styles.documentTextCol}>
                  <Text style={styles.documentFilename} numberOfLines={1}>
                    {docFilename || "Dokumen_Bukti.pdf"}
                  </Text>
                  <Text style={styles.documentSubText}>
                    Dokumen lampiran resmi • Ketuk untuk membaca
                  </Text>
                </View>
                <Text style={styles.documentActionArrow}>→</Text>
              </View>
            ) : (
              <CivicImage
                uri={photoUri}
                category={report.category}
                style={styles.heroPhoto}
                contentFit="cover"
                label={report.title}
                accessibilityLabel={`Foto bukti laporan ${report.title}`}
              />
            )}
          </View>

          {/* 4. Footer Metadata & Tombol Aksi Workflow */}
          <View style={styles.footerRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.timestampText}>🕒 {formattedDate}</Text>
            </View>

            {/* Quick Action Workflow Buttons */}
            <View style={styles.actionGroup}>
              {onUpdateStatus && report.status === "submitted" && (
                <TouchableOpacity
                  style={styles.verifyPillBtn}
                  onPress={() => onUpdateStatus(report.id, "verified")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Verifikasi laporan ini"
                >
                  <Text style={styles.verifyPillText}>✓ Verifikasi</Text>
                </TouchableOpacity>
              )}

              {onUpdateStatus && report.status === "verified" && (
                <TouchableOpacity
                  style={styles.progressPillBtn}
                  onPress={() => onUpdateStatus(report.id, "in_progress")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai laporan sedang diproses petugas"
                >
                  <Text style={styles.progressPillText}>⚙️ Proses</Text>
                </TouchableOpacity>
              )}

              {onUpdateStatus && report.status === "in_progress" && (
                <TouchableOpacity
                  style={styles.resolvePillBtn}
                  onPress={() => onUpdateStatus(report.id, "resolved")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai laporan telah selesai ditangani"
                >
                  <Text style={styles.resolvePillText}>✨ Selesai</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.report.id === nextProps.report.id &&
      prevProps.report.status === nextProps.report.status &&
      prevProps.report.severity === nextProps.report.severity &&
      prevProps.report.category === nextProps.report.category &&
      prevProps.report.mediaPath === nextProps.report.mediaPath &&
      prevProps.report.title === nextProps.report.title &&
      prevProps.report.description === nextProps.report.description &&
      prevProps.report.updatedAt === nextProps.report.updatedAt &&
      prevProps.onUpdateStatus === nextProps.onUpdateStatus &&
      prevProps.onPressItem === nextProps.onPressItem
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryIcon: {
    fontSize: 13,
    marginRight: 5,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  livePulseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.2,
  },
  rightBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  contentSection: {
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginTop: 4,
  },
  mediaContainer: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  heroPhoto: {
    width: "100%",
    height: 175,
    borderRadius: 18,
  },
  documentCardBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  documentIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  documentIconText: {
    fontSize: 22,
  },
  documentTextCol: {
    flex: 1,
  },
  documentFilename: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  documentSubText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  documentActionArrow: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "700",
    paddingRight: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.04)",
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestampText: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  actionGroup: {
    flexDirection: "row",
    gap: 6,
  },
  verifyPillBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    minHeight: 34,
    justifyContent: "center",
  },
  verifyPillText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  progressPillBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    minHeight: 34,
    justifyContent: "center",
  },
  progressPillText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  resolvePillBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    minHeight: 34,
    justifyContent: "center",
  },
  resolvePillText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
});
