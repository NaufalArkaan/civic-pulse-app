/**
 * Civic Pulse - Pertemuan 13 (Milestone 5)
 * Component: ReportCreateModal (Form Pelaporan Insiden Berbasis Supabase)
 * Role: Anggota 2 (Syahril - Lead Frontend & Performance Specialist)
 *
 * Responsiveness, Accessibility & Truthful Submission:
 * - Validasi formulir deklaratif inline (Judul 5-160 karakter, Deskripsi 10-2000 karakter).
 * - KeyboardAvoidingView adaptif untuk mencegah tertutupnya input oleh keyboard virtual.
 * - State pengiriman terkelola (submitting indicator, disable aksi ganda).
 * - Touch target >= 44 dp dan accessible labels/hints.
 * - Terintegrasi langsung dengan Supabase PostgREST & Offline Outbox via ReportRepository.
 */

import React, { useState, useCallback } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Report, CivicReportCategory, CivicReportSeverity } from "../../types/report";
import { Coordinate } from "../../types/location";
import { LAYOUT_CONSTRAINTS } from "../../constants/breakpoints";
import { THEME } from "../../constants/theme";
import { AnimatedPressable } from "../common/AnimatedPressable";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

export type ReportCreateModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    newReport: Omit<Report, "id" | "createdAt" | "updatedAt">
  ) => Promise<{ success: boolean; error?: string | null; syncOutcome?: string }>;
  defaultCoordinate?: Coordinate;
};

const CATEGORIES: { label: string; value: CivicReportCategory; icon: string }[] = [
  { label: "Kerusakan Jalan", value: "road-damage", icon: "🚧" },
  { label: "Banjir / Genangan", value: "flood", icon: "🌊" },
  { label: "Tanah Longsor", value: "landslide", icon: "⚠️" },
  { label: "Lampu PJU Padam", value: "street-light", icon: "💡" },
];

const SEVERITIES: { label: string; value: CivicReportSeverity; color: string }[] = [
  { label: "Rendah", value: "low", color: "#059669" },
  { label: "Sedang", value: "medium", color: "#D97706" },
  { label: "Kritis", value: "high", color: "#DC2626" },
];

export const ReportCreateModal = React.memo(function ReportCreateModal({
  visible,
  onClose,
  onSubmit,
  defaultCoordinate = { latitude: -7.9826, longitude: 112.6308 },
}: ReportCreateModalProps) {
  const { width, height } = useResponsiveLayout();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CivicReportCategory>("road-damage");
  const [severity, setSeverity] = useState<CivicReportSeverity>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validasi lokal sebelum pengiriman
  const isTitleValid = title.trim().length >= 5 && title.trim().length <= 160;
  const isDescriptionValid = description.trim().length >= 10 && description.trim().length <= 2000;
  const isFormValid = isTitleValid && isDescriptionValid;

  const handleResetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setCategory("road-damage");
    setSeverity("medium");
    setErrorMessage(null);
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      handleResetForm();
      onClose();
    }
  }, [isSubmitting, handleResetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Omit<Report, "id" | "createdAt" | "updatedAt"> = {
        title: title.trim(),
        category,
        description: description.trim(),
        status: "submitted",
        coordinate: defaultCoordinate,
        severity,
        isSimulation: false, // Menghasilkan data laporan nyata untuk Supabase
      };

      const result = await onSubmit(payload);

      if (result.success) {
        handleResetForm();
        onClose();
      } else {
        setErrorMessage(result.error || "Gagal mengirim laporan.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage("Terjadi kesalahan sistem saat mengirim laporan.");
      setIsSubmitting(false);
    }
  }, [isFormValid, isSubmitting, title, category, description, defaultCoordinate, severity, onSubmit, handleResetForm, onClose]);

  const modalWidth = Math.min(width - 32, LAYOUT_CONSTRAINTS.maxModalWidth);
  const modalMaxHeight = height > 600 ? 640 : height - 48;

  const titleCharCountColor = title.length > 160 ? THEME.colors.danger : THEME.colors.textMutedDark;
  const descCharCountColor = description.length > 2000 ? THEME.colors.danger : THEME.colors.textMutedDark;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          <View style={[styles.card, { width: modalWidth, maxHeight: modalMaxHeight }]}>
            {/* Modal Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.modalTitle}>Buat Laporan Insiden</Text>
                <Text style={styles.modalSubtitle}>Kirim laporan kerusakan atau bahaya ke pangkalan data</Text>
              </View>
              <AnimatedPressable
                style={styles.closeBtn}
                onPress={handleClose}
                disabled={isSubmitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Tutup formulir pelaporan"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </AnimatedPressable>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Error Alert Box */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </View>
              )}

              {/* Input: Judul Laporan */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Judul Laporan <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={[styles.charCount, { color: titleCharCountColor }]}>
                    {title.length}/160
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, title.length > 0 && !isTitleValid && styles.inputError]}
                  placeholder="Contoh: Tanggul Longsor di Dekat Jembatan"
                  placeholderTextColor={THEME.colors.textMutedLight}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={160}
                  editable={!isSubmitting}
                  accessibilityLabel="Judul laporan"
                  accessibilityHint="Wajib diisi minimal 5 karakter"
                />
                {title.length > 0 && title.trim().length < 5 && (
                  <Text style={styles.helperError}>Judul laporan minimal 5 karakter</Text>
                )}
              </View>

              {/* Selector: Kategori Insiden */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kategori Insiden</Text>
                <View style={styles.chipsRow}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.value;
                    return (
                      <AnimatedPressable
                        key={cat.value}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setCategory(cat.value)}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityLabel={`Kategori ${cat.label}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={styles.chipIcon}>{cat.icon}</Text>
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {cat.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              {/* Selector: Tingkat Keparahan */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tingkat Keparahan</Text>
                <View style={styles.severityRow}>
                  {SEVERITIES.map((sev) => {
                    const isSelected = severity === sev.value;
                    return (
                      <AnimatedPressable
                        key={sev.value}
                        style={[
                          styles.severityChip,
                          isSelected && { backgroundColor: sev.color, borderColor: sev.color },
                        ]}
                        onPress={() => setSeverity(sev.value)}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityLabel={`Keparahan ${sev.label}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            isSelected && styles.severityTextActive,
                            !isSelected && { color: sev.color },
                          ]}
                        >
                          {sev.label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              {/* Input: Deskripsi Rinci */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Deskripsi Masalah <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={[styles.charCount, { color: descCharCountColor }]}>
                    {description.length}/2000
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textArea,
                    description.length > 0 && !isDescriptionValid && styles.inputError,
                  ]}
                  placeholder="Jelaskan kondisi kerusakan infrastruktur, dampak terhadap warga, atau perkiraan luas genangan..."
                  placeholderTextColor={THEME.colors.textMutedLight}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                  accessibilityLabel="Deskripsi masalah infrastruktur"
                  accessibilityHint="Wajib diisi minimal 10 karakter"
                />
                {description.length > 0 && description.trim().length < 10 && (
                  <Text style={styles.helperError}>Deskripsi minimal 10 karakter</Text>
                )}
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={styles.footer}>
              <AnimatedPressable
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Batal pelaporan"
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={[styles.submitBtn, (!isFormValid || isSubmitting) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Kirim laporan ke Supabase"
              >
                {isSubmitting ? (
                  <View style={styles.submittingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Mengirim...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>🚀 Kirim Laporan</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  keyboardAvoid: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderLight,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.colors.textDark,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textMutedDark,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollContent: {
    paddingVertical: 6,
    gap: 12,
  },
  errorBanner: {
    backgroundColor: THEME.colors.dangerBg,
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: 10,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: THEME.colors.textDark,
  },
  required: {
    color: THEME.colors.danger,
  },
  charCount: {
    fontSize: 11,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderLight,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: THEME.colors.textDark,
  },
  textArea: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderLight,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.textDark,
    minHeight: 88,
  },
  inputError: {
    borderColor: THEME.colors.danger,
    backgroundColor: THEME.colors.dangerBg,
  },
  helperError: {
    fontSize: 11,
    color: THEME.colors.danger,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    minHeight: 34,
    gap: 4,
  },
  chipActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primary,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: "700",
  },
  severityRow: {
    flexDirection: "row",
    gap: 8,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "700",
  },
  severityTextActive: {
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.primary,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
