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

import React, { useState, useCallback, useEffect } from "react";
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
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Report, CivicReportCategory, CivicReportSeverity } from "../../types/report";
import { Coordinate } from "../../types/location";
import { VaultFile } from "../../types/vault";
import { documentVault } from "../../services/files/documentVault";
import { LAYOUT_CONSTRAINTS } from "../../constants/breakpoints";
import { THEME } from "../../constants/theme";
import { AnimatedPressable } from "../common/AnimatedPressable";
import { CivicImage } from "../common/CivicImage";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { normalizeLocalFileUri } from "../../utils/reportMedia";

export type ReportCreateModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    newReport: Omit<Report, "id" | "createdAt" | "updatedAt">
  ) => Promise<{ success: boolean; error?: string | null; syncOutcome?: string }>;
  defaultCoordinate?: Coordinate;
  initialVaultFileUri?: string | null;
  initialVaultFileName?: string | null;
  initialVaultFileType?: "photo" | "document" | "other" | null;
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

const MALANG_LANDMARKS = [
  { label: "Alun-Alun", lat: -7.9826, lng: 112.6308 },
  { label: "Jl. Soehat", lat: -7.9418, lng: 112.6165 },
  { label: "Tlogomas", lat: -7.9225, lng: 112.5982 },
  { label: "Veteran", lat: -7.9541, lng: 112.6142 },
  { label: "Pujon-Batu", lat: -7.8655, lng: 112.4968 },
];

const DEFAULT_COORDINATE: Coordinate = { latitude: -7.9826, longitude: 112.6308 };

export const ReportCreateModal = React.memo(function ReportCreateModal({
  visible,
  onClose,
  onSubmit,
  defaultCoordinate = DEFAULT_COORDINATE,
  initialVaultFileUri = null,
  initialVaultFileName = null,
  initialVaultFileType = null,
}: ReportCreateModalProps) {
  const { width, height } = useResponsiveLayout();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CivicReportCategory>("road-damage");
  const [severity, setSeverity] = useState<CivicReportSeverity>("medium");
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [selectedVaultFile, setSelectedVaultFile] = useState<string | null>(initialVaultFileUri || null);
  const [selectedVaultFileName, setSelectedVaultFileName] = useState<string | null>(initialVaultFileName || null);
  const [selectedVaultFileType, setSelectedVaultFileType] = useState<string | null>(initialVaultFileType || null);
  const [latitude, setLatitude] = useState<string>(defaultCoordinate.latitude.toString());
  const [longitude, setLongitude] = useState<string>(defaultCoordinate.longitude.toString());
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportingToVault, setIsImportingToVault] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref untuk melacak perubahan visibilitas modal agar form tidak ter-reset saat re-render
  const prevVisibleRef = React.useRef(false);

  // Sinkronisasi koordinat awal & berkas tautan HANYA saat modal pertama kali dibuka
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setLatitude(defaultCoordinate.latitude.toString());
      setLongitude(defaultCoordinate.longitude.toString());

      if (initialVaultFileUri) {
        const cleanUri = normalizeLocalFileUri(initialVaultFileUri) || initialVaultFileUri;
        setSelectedVaultFile(cleanUri);
        setSelectedVaultFileName(initialVaultFileName || "Lampiran Document Vault");
        setSelectedVaultFileType(initialVaultFileType || "photo");
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, defaultCoordinate, initialVaultFileUri, initialVaultFileName, initialVaultFileType]);

  // Muat berkas dari Document Vault (Scoped Storage) saat modal dibuka
  useEffect(() => {
    if (visible) {
      documentVault.listFiles().then((res) => {
        if (res.success && res.data) {
          setVaultFiles(res.data.filter((f) => !f.isMissing));
        }
      });
    }
  }, [visible]);

  // Handler pengambilan koordinat GPS riil perangkat (LastKnown + Fresh Position with Timeout)
  const handleGetGPSLocation = useCallback(async () => {
    setIsLocating(true);
    setErrorMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Izin akses lokasi ditolak. Silakan aktifkan izin lokasi di pengaturan atau gunakan titik cepat Malang.");
        return;
      }

      // 1. Coba ambil koordinat terakhir perangkat (instan, <50ms)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown && lastKnown.coords) {
        setLatitude(lastKnown.coords.latitude.toFixed(6));
        setLongitude(lastKnown.coords.longitude.toFixed(6));
      }

      // 2. Coba perbarui dengan posisi GPS akurat dengan timeout 5 detik
      try {
        const freshPosition = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout deteksi GPS")), 5000)
          ),
        ]);

        if (freshPosition && "coords" in freshPosition) {
          setLatitude(freshPosition.coords.latitude.toFixed(6));
          setLongitude(freshPosition.coords.longitude.toFixed(6));
        }
      } catch {
        // Jika pembacaan baru timeout tapi lastKnown tersedia, tetap gunakan lastKnown
        if (!lastKnown) {
          throw new Error("Sensor GPS membutuhkan waktu lebih lama. Silakan pilih salah satu Titik Cepat Malang.");
        }
      }
    } catch (locErr: any) {
      setErrorMessage("Gagal mengambil lokasi GPS: " + (locErr?.message || "Pastikan sensor GPS aktif."));
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Quick Action: Ambil Foto Kamera Langsung di Lokasi (Anti-Fraud / SDG 11)
  const handleTakePhotoWithCamera = useCallback(async () => {
    setIsImportingToVault(true);
    setErrorMessage(null);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Izin kamera diperlukan untuk mengambil foto bukti kerusakan langsung di lokasi.");
        return;
      }

      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
        base64: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const asset = pickerResult.assets[0];
      const fileName = `foto_kamera_${Date.now()}.jpg`;
      const res = await documentVault.importFile(
        asset.uri,
        fileName,
        asset.mimeType || "image/jpeg",
        "photo",
        asset.fileSize,
        asset.base64 || undefined
      );

      if (res.success && res.data) {
        setSelectedVaultFile(res.data.localUri);
        setSelectedVaultFileName(res.data.displayName);
        setSelectedVaultFileType("photo");
        const listRes = await documentVault.listFiles();
        if (listRes.success && listRes.data) {
          setVaultFiles(listRes.data.filter((f) => !f.isMissing));
        }
      } else {
        setErrorMessage(res.error || "Gagal menyimpan foto kamera ke Document Vault.");
      }
    } catch (err: any) {
      setErrorMessage("Gagal mengambil foto kamera: " + (err?.message || "Kesalahan tidak diketahui."));
    } finally {
      setIsImportingToVault(false);
    }
  }, []);

  // Quick Action: Ambil Foto dari HP, simpan ke Vault, & langsung tautkan sebagai bukti laporan
  const handlePickPhotoToVault = useCallback(async () => {
    setIsImportingToVault(true);
    setErrorMessage(null);
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
        base64: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const asset = pickerResult.assets[0];
      const fileName = asset.fileName || `foto_bukti_${Date.now()}.jpg`;
      const res = await documentVault.importFile(
        asset.uri,
        fileName,
        asset.mimeType || "image/jpeg",
        "photo",
        asset.fileSize,
        asset.base64 || undefined
      );

      if (res.success && res.data) {
        setSelectedVaultFile(res.data.localUri);
        setSelectedVaultFileName(res.data.displayName);
        setSelectedVaultFileType("photo");
        const listRes = await documentVault.listFiles();
        if (listRes.success && listRes.data) {
          setVaultFiles(listRes.data.filter((f) => !f.isMissing));
        }
      } else {
        setErrorMessage(res.error || "Gagal menyimpan foto ke Document Vault.");
      }
    } catch (err: any) {
      setErrorMessage("Gagal memilih foto: " + (err?.message || "Kesalahan tidak diketahui."));
    } finally {
      setIsImportingToVault(false);
    }
  }, []);

  // Quick Action: Pilih Dokumen PDF dari HP, simpan ke Vault, & langsung tautkan sebagai bukti
  const handlePickDocToVault = useCallback(async () => {
    setIsImportingToVault(true);
    setErrorMessage(null);
    try {
      let pickerResult;
      try {
        pickerResult = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          copyToCacheDirectory: true,
        });
      } catch {
        pickerResult = await DocumentPicker.getDocumentAsync({
          type: "*/*",
        });
      }

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const asset = pickerResult.assets[0];
      const fileName = asset.name || `dokumen_bukti_${Date.now()}`;
      const res = await documentVault.importFile(
        asset.uri,
        fileName,
        asset.mimeType || null,
        "document",
        asset.size
      );

      if (res.success && res.data) {
        setSelectedVaultFile(res.data.localUri);
        setSelectedVaultFileName(res.data.displayName);
        setSelectedVaultFileType("document");
        const listRes = await documentVault.listFiles();
        if (listRes.success && listRes.data) {
          setVaultFiles(listRes.data.filter((f) => !f.isMissing));
        }
      } else {
        setErrorMessage(res.error || "Gagal menyimpan dokumen ke Document Vault.");
      }
    } catch (err: any) {
      setErrorMessage("Gagal memilih dokumen: " + (err?.message || "Kesalahan tidak diketahui."));
    } finally {
      setIsImportingToVault(false);
    }
  }, []);

  // Validasi lokal sebelum pengiriman
  const isTitleValid = title.trim().length >= 5 && title.trim().length <= 160;
  const isDescriptionValid = description.trim().length >= 10 && description.trim().length <= 2000;
  const isFormValid = isTitleValid && isDescriptionValid;

  const handleResetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setCategory("road-damage");
    setSeverity("medium");
    setSelectedVaultFile(null);
    setSelectedVaultFileName(null);
    setSelectedVaultFileType(null);
    setLatitude(defaultCoordinate.latitude.toString());
    setLongitude(defaultCoordinate.longitude.toString());
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [defaultCoordinate]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      handleResetForm();
      onClose();
    }
  }, [isSubmitting, handleResetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (
      isNaN(latNum) ||
      isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      setErrorMessage(
        "Koordinat tidak valid. Pastikan latitude (-90 s/d 90) dan longitude (-180 s/d 180) diisi dengan benar.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Omit<Report, "id" | "createdAt" | "updatedAt"> = {
        title: title.trim(),
        category,
        description: description.trim(),
        status: "submitted",
        coordinate: {
          latitude: latNum,
          longitude: lngNum,
        },
        severity,
        mediaPath: selectedVaultFile || null,
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
  }, [
    isFormValid,
    isSubmitting,
    title,
    category,
    description,
    latitude,
    longitude,
    severity,
    selectedVaultFile,
    onSubmit,
    handleResetForm,
    onClose,
  ]);

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

              {/* Selector & Input: Titik Koordinat GPS Lokasi Insiden */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Titik Koordinat Lokasi <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.gpsAutoBtn, isLocating && styles.gpsAutoBtnDisabled]}
                    onPress={handleGetGPSLocation}
                    disabled={isLocating || isSubmitting}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Ambil koordinat GPS saat ini"
                  >
                    {isLocating ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.gpsAutoBtnText}>Mencari GPS...</Text>
                      </View>
                    ) : (
                      <Text style={styles.gpsAutoBtnText}>📍 Ambil GPS Saya</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Coordinate Inputs Row */}
                <View style={styles.coordRow}>
                  <View style={styles.coordCol}>
                    <Text style={styles.coordLabel}>Latitude (Garis Lintang)</Text>
                    <View style={styles.inputWithToggleRow}>
                      <TextInput
                        style={[styles.coordInput, { flex: 1 }]}
                        value={latitude}
                        onChangeText={(val) => setLatitude(val.replace(",", "."))}
                        keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="-7.9826"
                        placeholderTextColor={THEME.colors.textMutedLight}
                        editable={!isSubmitting}
                        accessibilityLabel="Nilai latitude koordinat"
                      />
                      <TouchableOpacity
                        style={styles.negateBtn}
                        onPress={() => {
                          if (latitude.startsWith("-")) {
                            setLatitude(latitude.substring(1));
                          } else if (latitude.length > 0) {
                            setLatitude("-" + latitude);
                          } else {
                            setLatitude("-");
                          }
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="Ubah tanda minus atau plus latitude"
                      >
                        <Text style={styles.negateBtnText}>±</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.coordCol}>
                    <Text style={styles.coordLabel}>Longitude (Garis Bujur)</Text>
                    <TextInput
                      style={styles.coordInput}
                      value={longitude}
                      onChangeText={(val) => setLongitude(val.replace(",", "."))}
                      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="112.6308"
                      placeholderTextColor={THEME.colors.textMutedLight}
                      editable={!isSubmitting}
                      accessibilityLabel="Nilai longitude koordinat"
                    />
                  </View>
                </View>

                {/* Quick Landmark Presets */}
                <Text style={styles.presetHeading}>Titik Cepat Wilayah Malang:</Text>
                <View style={styles.landmarkRow}>
                  {MALANG_LANDMARKS.map((lm) => {
                    const isSelected =
                      latitude === lm.lat.toString() && longitude === lm.lng.toString();
                    return (
                      <TouchableOpacity
                        key={lm.label}
                        style={[styles.landmarkChip, isSelected && styles.landmarkChipActive]}
                        onPress={() => {
                          setLatitude(lm.lat.toString());
                          setLongitude(lm.lng.toString());
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.landmarkChipText,
                            isSelected && styles.landmarkChipTextActive,
                          ]}
                        >
                          {lm.label}
                        </Text>
                      </TouchableOpacity>
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

              {/* Selector: Lampiran Bukti dari Document Vault */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Tautkan Bukti dari Document Vault</Text>
                  <Text style={styles.vaultBadgeText}>Scoped Storage</Text>
                </View>

                {/* Quick Import Actions Langsung ke Vault */}
                <TouchableOpacity
                  style={styles.vaultCameraBtn}
                  onPress={handleTakePhotoWithCamera}
                  disabled={isImportingToVault || isSubmitting}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Ambil foto kamera langsung di lapangan"
                >
                  <Text style={styles.vaultCameraBtnText}>📸 Ambil Foto Kamera Langsung (Cegah Penipuan)</Text>
                </TouchableOpacity>

                <View style={styles.vaultActionRow}>
                  <TouchableOpacity
                    style={styles.vaultAddBtn}
                    onPress={handlePickPhotoToVault}
                    disabled={isImportingToVault || isSubmitting}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Ambil foto dari Galeri HP"
                  >
                    <Text style={styles.vaultAddBtnText}>🖼️ Galeri Foto HP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.vaultAddBtnSecondary}
                    onPress={handlePickDocToVault}
                    disabled={isImportingToVault || isSubmitting}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih dokumen PDF ke Document Vault"
                  >
                    <Text style={styles.vaultAddBtnSecondaryText}>📄 Impor Dokumen (PDF)</Text>
                  </TouchableOpacity>
                </View>

                {isImportingToVault && (
                  <View style={styles.importingVaultIndicator}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.importingVaultText}>Menyimpan berkas ke Scoped Storage...</Text>
                  </View>
                )}

                {/* Tampilan Lampiran Aktif yang Dipilih */}
                {selectedVaultFile && (
                  <View style={styles.attachedCard}>
                    {selectedVaultFileType === "photo" ||
                    selectedVaultFile.endsWith(".jpg") ||
                    selectedVaultFile.endsWith(".jpeg") ||
                    selectedVaultFile.endsWith(".png") ? (
                      <CivicImage
                        uri={selectedVaultFile}
                        fallbackUri={null}
                        category={category}
                        compact
                        style={styles.attachedThumbnail}
                        accessibilityLabel={`Lampiran ${selectedVaultFileName || "Foto"}`}
                      />
                    ) : (
                      <View style={styles.attachedDocBox}>
                        <Text style={styles.attachedDocIcon}>📄</Text>
                      </View>
                    )}
                    <View style={styles.attachedInfo}>
                      <Text style={styles.attachedTitle} numberOfLines={1}>
                        {selectedVaultFileName || "Berkas Terlampir"}
                      </Text>
                      <Text style={styles.attachedSubtitle}>
                        🔒 Bukti Asli Document Vault (Private Sandbox)
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.attachedRemoveBtn}
                      onPress={() => {
                        setSelectedVaultFile(null);
                        setSelectedVaultFileName(null);
                        setSelectedVaultFileType(null);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Lepas lampiran berkas"
                    >
                      <Text style={styles.attachedRemoveText}>✕ Lepas</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Pilih dari Berkas yang Sudah Ada di Vault */}
                <Text style={styles.presetHeading}>Pilih dari Koleksi Vault Lokal:</Text>
                {vaultFiles.length === 0 ? (
                  <View style={styles.emptyVaultBox}>
                    <Text style={styles.emptyVaultText}>
                      Belum ada berkas di Brankas Dokumen. Gunakan tombol di atas untuk mengimpor foto atau dokumen inspeksi langsung dari perangkat.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.vaultScrollContent}
                  >
                    <TouchableOpacity
                      style={[
                        styles.vaultChip,
                        selectedVaultFile === null && styles.vaultChipActive,
                      ]}
                      onPress={() => {
                        setSelectedVaultFile(null);
                        setSelectedVaultFileName(null);
                        setSelectedVaultFileType(null);
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Tanpa lampiran berkas"
                    >
                      <Text
                        style={[
                          styles.vaultChipText,
                          selectedVaultFile === null && styles.vaultChipTextActive,
                        ]}
                      >
                        Tanpa Bukti Lampiran
                      </Text>
                    </TouchableOpacity>

                    {vaultFiles.map((file) => {
                      const cleanFileUri = normalizeLocalFileUri(file.localUri) || file.localUri;
                      const isSelected =
                        selectedVaultFile === file.localUri ||
                        selectedVaultFile === cleanFileUri;
                      const sizeMb = file.sizeBytes
                        ? `(${(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`
                        : "";
                      const icon = file.category === "photo" ? "📷" : "📄";
                      return (
                        <TouchableOpacity
                          key={file.id}
                          style={[
                            styles.vaultChip,
                            isSelected && styles.vaultChipActive,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedVaultFile(null);
                              setSelectedVaultFileName(null);
                              setSelectedVaultFileType(null);
                            } else {
                              setSelectedVaultFile(cleanFileUri);
                              setSelectedVaultFileName(file.displayName);
                              setSelectedVaultFileType(file.category);
                            }
                          }}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Pilih lampiran ${file.displayName}`}
                        >
                          <Text
                            style={[
                              styles.vaultChipText,
                              isSelected && styles.vaultChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {icon} {file.displayName} {sizeMb}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                <Text style={styles.vaultHelper}>
                  🔒 Bukti fisik asli dari Scoped Storage privat perangkat Anda akan ditautkan sebagai lampiran resmi.
                </Text>
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
  vaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  emptyVaultBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyVaultText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  vaultScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  vaultChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  vaultChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  vaultChipTextActive: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  vaultHelper: {
    fontSize: 10.5,
    color: "#64748B",
    lineHeight: 15,
  },
  gpsAutoBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsAutoBtnDisabled: {
    opacity: 0.6,
  },
  gpsAutoBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  coordRow: {
    flexDirection: "row",
    gap: 10,
  },
  coordCol: {
    flex: 1,
    gap: 4,
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  coordInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderLight,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: THEME.colors.textDark,
  },
  inputWithToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  negateBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: THEME.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  negateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  presetHeading: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  landmarkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  landmarkChip: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  landmarkChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  landmarkChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  landmarkChipTextActive: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  vaultCameraBtn: {
    backgroundColor: "#15803D",
    borderWidth: 1,
    borderColor: "#166534",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  vaultCameraBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  vaultActionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  vaultAddBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultAddBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  vaultAddBtnSecondary: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  vaultAddBtnSecondaryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  importingVaultIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  importingVaultText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  attachedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  attachedThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
    marginRight: 10,
  },
  attachedDocBox: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  attachedDocIcon: {
    fontSize: 22,
  },
  attachedInfo: {
    flex: 1,
  },
  attachedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  attachedSubtitle: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "600",
  },
  attachedRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  attachedRemoveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
});
