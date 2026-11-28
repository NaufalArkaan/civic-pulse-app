/**
 * Civic Pulse - Modul LBS
 * Component: SelectedReportCard
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Responsiveness & Usability:
 * - Menggunakan Safe Area Insets dinamis agar tidak tertutup navigation bar Android / iOS.
 * - Penanda tegas "DATA SIMULASI" untuk menjaga integritas data pengujian (SDG 11).
 * - Menampilkan jarak garis lurus Haversine yang telah dihitung oleh layer kalkulasi.
 * - Aksi fokus peta opsional untuk mempermudah inspeksi titik kerusakan infrastruktur.
 * - Desain card modern, kontras tinggi, dan aksesibilitas lengkap (WCAG AA).
 */

import React, { memo, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  useWindowDimensions,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  ReduceMotion,
} from "react-native-reanimated";
import { SelectedReportCardProps } from "../../types/components";
import { CivicReportCategory, CivicReportSeverity } from "../../types/report";
import { LAYOUT_CONSTRAINTS } from "../../constants/breakpoints";
import {
  getReportPhotoUri,
  isReportUsingVaultMedia,
  isReportDocumentMedia,
  getReportMediaFilename,
  DISASTER_CATEGORY_PHOTOS,
  safeShareDocumentOrMediaAsync,
} from "../../utils/reportMedia";
import { CivicImage } from "../common/CivicImage";

const CATEGORY_META: Record<
  CivicReportCategory,
  { label: string; icon: string; bg: string; text: string }
> = {
  "road-damage": {
    label: "Kerusakan Jalan",
    icon: "🚧",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  flood: {
    label: "Banjir / Genangan",
    icon: "🌊",
    bg: "#DBEAFE",
    text: "#1E40AF",
  },
  landslide: {
    label: "Tanah Longsor",
    icon: "⚠️",
    bg: "#FEE2E2",
    text: "#991B1B",
  },
  "street-light": {
    label: "Lampu Jalan Padam",
    icon: "💡",
    bg: "#FEF9C3",
    text: "#854D0E",
  },
};

const SEVERITY_CONFIG: Record<
  CivicReportSeverity,
  { label: string; color: string; bg: string }
> = {
  high: { label: "Kritis / Tinggi", color: "#DC2626", bg: "#FEF2F2" },
  medium: { label: "Tingkat Sedang", color: "#D97706", bg: "#FFFBEB" },
  low: { label: "Tingkat Rendah", color: "#059669", bg: "#ECFDF5" },
};

export const SelectedReportCard = memo(function SelectedReportCard({
  report,
  userLocation,
  distanceFormatted,
  onClose,
  onFocusReport,
  insets,
}: SelectedReportCardProps) {
  const categoryMeta = CATEGORY_META[report.category] || {
    label: report.category,
    icon: "📍",
    bg: "#F1F5F9",
    text: "#334155",
  };
  const severityMeta = SEVERITY_CONFIG[report.severity] || {
    label: report.severity,
    color: "#475569",
    bg: "#F1F5F9",
  };

  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, LAYOUT_CONSTRAINTS.maxCardWidth);
  const leftOffset = (width - cardWidth) / 2;
  const bottomPosition = (insets?.bottom ?? 0) > 0 ? insets!.bottom + 12 : 20;

  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState<boolean>(false);
  const photoUri = getReportPhotoUri(report);
  const isDocument = isReportDocumentMedia(report);
  const isVaultMedia = isReportUsingVaultMedia(report);
  const mediaFilename = getReportMediaFilename(report);

  const handleOpenDocument = async () => {
    if (!report.mediaPath) return;
    const res = await safeShareDocumentOrMediaAsync({
      uri: report.mediaPath,
      displayName: mediaFilename || `Bukti_${report.id}.pdf`,
      fallbackTitle: report.title,
      fallbackDescription: report.description,
    });
    if (!res.success && res.error) {
      Alert.alert("Info Dokumen", res.error);
    }
  };

  // Reanimated slide-up entrance animation
  const translateY = useSharedValue(80);

  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 18,
      stiffness: 160,
      reduceMotion: ReduceMotion.System,
    });
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          left: leftOffset,
          bottom: bottomPosition,
        },
        animatedStyle,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Rincian Laporan: ${report.title}. Kategori ${categoryMeta.label}, Jarak: ${distanceFormatted}`}
    >
      {/* Top Header: Data Truthfulness Flag & Close Button */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.realDataBadge}>
            <Text style={styles.realDataBadgeText}>LAPORAN RESMI</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: categoryMeta.bg }]}>
            <Text style={styles.categoryIcon}>{categoryMeta.icon}</Text>
            <Text style={[styles.categoryLabel, { color: categoryMeta.text }]}>
              {categoryMeta.label}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Tutup rincian laporan"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {report.title}
      </Text>

      {/* Meta Metrics: Severity & Haversine Distance */}
      <View style={styles.metaRow}>
        <View
          style={[styles.severityBadge, { backgroundColor: severityMeta.bg, borderColor: severityMeta.color + "40" }]}
        >
          <View style={[styles.severityDot, { backgroundColor: severityMeta.color }]} />
          <Text style={[styles.severityText, { color: severityMeta.color }]}>
            {severityMeta.label}
          </Text>
        </View>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceIcon}>📏</Text>
          <Text style={styles.distanceLabel}>Jarak Lurus:</Text>
          <Text
            style={[
              styles.distanceValue,
              !userLocation && styles.distanceValueWaiting,
            ]}
          >
            {distanceFormatted}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {report.description}
      </Text>

      {/* Evidence Section: Real Document Card or Photo with Tap-to-Enlarge */}
      {isDocument ? (
        <View style={styles.docAttachmentCard}>
          <View style={styles.docAttachmentLeft}>
            <Text style={styles.docAttachmentIcon}>📄</Text>
            <View style={styles.docAttachmentTextBox}>
              <Text style={styles.docAttachmentTitle} numberOfLines={1}>
                {mediaFilename || "Dokumen Mitigasi Lapangan"}
              </Text>
              <Text style={styles.docAttachmentBadge}>
                🔒 Lampiran Dokumen Asli (Document Vault)
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.docAttachmentOpenBtn}
            onPress={handleOpenDocument}
            accessibilityRole="button"
            accessibilityLabel="Ekspor atau bagikan dokumen bukti"
          >
            <Text style={styles.docAttachmentOpenBtnText}>📤 Ekspor / Bagikan PDF</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={() => setIsPhotoModalVisible(true)}
          activeOpacity={0.88}
          accessibilityRole="imagebutton"
          accessibilityLabel="Foto bukti bencana atau kerusakan. Ketuk untuk memperbesar."
        >
          <CivicImage
            uri={photoUri}
            fallbackUri={DISASTER_CATEGORY_PHOTOS[report.category]}
            category={report.category}
            style={styles.disasterPhoto}
            label={report.title}
          />
          <View
            style={[
              styles.photoOverlayBadge,
              isVaultMedia && styles.photoOverlayBadgeVault,
            ]}
          >
            <Text style={styles.photoOverlayBadgeText}>
              {isVaultMedia
                ? `🔒 Bukti Foto Asli Warga (Vault) • ${mediaFilename}`
                : "📸 Foto Dokumentasi Lapangan (SDG 11)"}
            </Text>
          </View>
          <View style={styles.photoZoomTag}>
            <Text style={styles.photoZoomTagText}>🔍 Ketuk Perbesar</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Action Footer: Focus on Point */}
      {onFocusReport && (
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.focusButton}
            onPress={() => onFocusReport(report)}
            accessibilityRole="button"
            accessibilityLabel={`Pusatkan peta ke lokasi ${report.title}`}
          >
            <Text style={styles.focusButtonText}>📍 Pusatkan ke Lokasi Laporan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full-Screen Disaster Photo Modal */}
      <Modal
        visible={isPhotoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <View style={styles.photoModalBackdrop}>
          <View style={styles.photoModalHeader}>
            <View style={styles.photoModalTitleBox}>
              <Text style={styles.photoModalTitle} numberOfLines={1}>
                {report.title}
              </Text>
              <Text style={styles.photoModalSubtitle}>
                {categoryMeta.label} • {distanceFormatted}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.photoModalCloseBtn}
              onPress={() => setIsPhotoModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Tutup pratinjau foto"
            >
              <Text style={styles.photoModalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <CivicImage
            uri={photoUri}
            fallbackUri={DISASTER_CATEGORY_PHOTOS[report.category]}
            category={report.category}
            contentFit="contain"
            style={styles.photoModalFullImage}
            label={report.title}
          />

          <View style={styles.photoModalFooter}>
            <Text style={styles.photoModalCaption}>
              {report.description}
            </Text>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  simulationBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simulationBadgeText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  realDataBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  realDataBadgeText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 11,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  closeButtonText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "bold",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  severityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  distanceIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  distanceLabel: {
    fontSize: 11,
    color: "#64748B",
    marginRight: 6,
  },
  distanceValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  distanceValueWaiting: {
    color: "#94A3B8",
    fontStyle: "italic",
    fontWeight: "500",
  },
  description: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  footerRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  focusButton: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  photoContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  disasterPhoto: {
    width: "100%",
    height: 125,
  },
  photoOverlayBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoOverlayBadgeVault: {
    backgroundColor: "rgba(22, 101, 52, 0.88)",
  },
  photoOverlayBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  docAttachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  docAttachmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  docAttachmentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  docAttachmentTextBox: {
    flex: 1,
  },
  docAttachmentTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  docAttachmentBadge: {
    fontSize: 10,
    color: "#15803D",
    marginTop: 1,
  },
  docAttachmentOpenBtn: {
    backgroundColor: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  docAttachmentOpenBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  photoZoomTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(32, 138, 239, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoZoomTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  photoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  photoModalTitleBox: {
    flex: 1,
    marginRight: 12,
  },
  photoModalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  photoModalSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  photoModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  photoModalFullImage: {
    width: "100%",
    flex: 1,
  },
  photoModalFooter: {
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  photoModalCaption: {
    color: "#E2E8F0",
    fontSize: 12.5,
    lineHeight: 18,
  },
});
