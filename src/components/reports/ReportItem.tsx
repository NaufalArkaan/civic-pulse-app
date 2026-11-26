/**
 * Civic Pulse - Pertemuan 11
 * Component: ReportItem
 * Role: Anggota 2 (Lead Frontend & Reactive UI Specialist)
 *
 * Performance & Ergonomics Safeguards:
 * - Menggunakan `React.memo` dengan comparator spesifik untuk mencegah re-render seluruh item
 *   ketika ada event realtime INSERT/UPDATE/DELETE pada item lain.
 * - Touch target tombol aksi memenuhi standar minimum aksesibilitas (>= 44 dp).
 * - Indikator live realtime badge untuk laporan yang baru saja diterima.
 * - Aksesibilitas penuh untuk screen reader (TalkBack & VoiceOver).
 */

import { memo, useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
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
  DISASTER_CATEGORY_PHOTOS,
} from "../../utils/reportMedia";

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
  "road-damage": "Kerusakan Jalan",
  flood: "Banjir / Genangan",
  landslide: "Tanah Longsor",
  "street-light": "Lampu PJU Padam",
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
    bg: "#DBEAFE",
    borderColor: "#BFDBFE",
  },
  in_progress: {
    label: "Sedang Diproses",
    color: "#7C3AED",
    bg: "#EDE9FE",
    borderColor: "#DDD6FE",
  },
  resolved: {
    label: "Telah Selesai",
    color: "#059669",
    bg: "#D1FAE5",
    borderColor: "#A7F3D0",
  },
  rejected: {
    label: "Ditolak",
    color: "#DC2626",
    bg: "#FEE2E2",
    borderColor: "#FECACA",
  },
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Kritis", color: "#DC2626" },
  medium: { label: "Sedang", color: "#D97706" },
  low: { label: "Rendah", color: "#059669" },
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
    const severityInfo =
      SEVERITY_LABELS[report.severity] || SEVERITY_LABELS.medium;
    const [thumbError, setThumbError] = useState(false);
    const photoUri = getReportPhotoUri(report);
    const resolvedPhotoUri = thumbError
      ? DISASTER_CATEGORY_PHOTOS[report.category] || DISASTER_CATEGORY_PHOTOS["road-damage"]
      : photoUri;

    const formattedDate = new Date(report.createdAt).toLocaleDateString(
      "id-ID",
      {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    // Indikator laporan baru masuk (dibuat kurang dari 3 menit yang lalu)
    const isRecentlyCreated =
      Date.now() - new Date(report.createdAt).getTime() < 3 * 60 * 1000;

    const a11yLabel = `Laporan ${categoryName}: ${report.title}. Status: ${
      statusInfo.label
    }. Tingkat: ${severityInfo.label}. Waktu: ${formattedDate}.`;

    // Reanimated Shared Value untuk micro-interaction press feedback
    const scale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.98, {
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
          activeOpacity={onPressItem ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={
            onPressItem
              ? "Ketuk untuk melihat detail lokasi dan laporan"
              : undefined
          }
        >
          {/* Top Header Row: Category Badge & Status Pill */}
          <View style={styles.topRow}>
            <View style={styles.badgeGroup}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryIcon}>{icon}</Text>
                <Text style={styles.categoryName}>{categoryName}</Text>
              </View>

              {isRecentlyCreated && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>⚡ Live Baru</Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusInfo.bg,
                  borderColor: statusInfo.borderColor,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Title, Description & Photo Thumbnail Row */}
          <View style={styles.bodyRow}>
            <View style={styles.bodyTextContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {report.title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {report.description}
              </Text>
            </View>
            {isReportDocumentMedia(report) ? (
              <View style={styles.thumbnailDocBox}>
                <Text style={styles.thumbnailDocIcon}>📄</Text>
                <Text style={styles.thumbnailDocLabel}>PDF</Text>
              </View>
            ) : (
              <Image
                source={{ uri: resolvedPhotoUri }}
                style={styles.thumbnailPhoto}
                contentFit="cover"
                transition={150}
                onError={() => setThumbError(true)}
              />
            )}
          </View>

          {/* Metadata & Actions Footer */}
          <View style={styles.footerRow}>
            <View style={styles.metaLeft}>
              <Text style={styles.timestamp}>📅 {formattedDate}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text
                style={[styles.severityText, { color: severityInfo.color }]}
              >
                {severityInfo.label}
              </Text>
            </View>

            {/* Quick Action Workflow Buttons */}
            <View style={styles.actionGroup}>
              {onUpdateStatus && report.status === "submitted" && (
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => onUpdateStatus(report.id, "verified")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Verifikasi laporan ini"
                >
                  <Text style={styles.verifyBtnText}>✓ Verifikasi</Text>
                </TouchableOpacity>
              )}

              {onUpdateStatus && report.status === "verified" && (
                <TouchableOpacity
                  style={styles.progressBtn}
                  onPress={() => onUpdateStatus(report.id, "in_progress")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai laporan sedang diproses petugas"
                >
                  <Text style={styles.progressBtnText}>⚙️ Proses</Text>
                </TouchableOpacity>
              )}

              {onUpdateStatus && report.status === "in_progress" && (
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => onUpdateStatus(report.id, "resolved")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Tandai laporan telah selesai ditangani"
                >
                  <Text style={styles.resolveBtnText}>✨ Selesai</Text>
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
      prevProps.report.isSimulation === nextProps.report.isSimulation &&
      prevProps.report.title === nextProps.report.title &&
      prevProps.report.description === nextProps.report.description &&
      prevProps.report.updatedAt === nextProps.report.updatedAt &&
      prevProps.onUpdateStatus === nextProps.onUpdateStatus &&
      prevProps.onPressItem === nextProps.onPressItem
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  liveBadge: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#059669",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  title: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    lineHeight: 19,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  bodyTextContainer: {
    flex: 1,
  },
  thumbnailPhoto: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  thumbnailDocBox: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailDocIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  thumbnailDocLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#166534",
  },
  description: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestamp: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  metaDot: {
    marginHorizontal: 6,
    color: "#CBD5E1",
    fontSize: 10,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionGroup: {
    flexDirection: "row",
    gap: 6,
  },
  verifyBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  progressBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  progressBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  resolveBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  resolveBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
