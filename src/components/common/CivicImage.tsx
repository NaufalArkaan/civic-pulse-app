/**
 * Civic Pulse - Pertemuan 13
 * Component: CivicImage (Smart Local Sandbox & Remote Image Renderer)
 * Role: Anggota 2 (Lead Frontend & Performance Specialist)
 *
 * Fitur Utama:
 * - Resolusi otomatis URI lokal (file://) melalui ExpoFileSystem Base64 cache untuk melewati
 *   batasan decoding path "%2540anonymous%252F" pada Android Expo Go.
 * - Fallback bertingkat: Berkas Lokal Vault -> Foto Kategori Mitigasi -> Kartu Visual Offline.
 * - Menjamin tidak pernah ada kotak abu-abu kosong (blank grey box) atau error gambar gelap.
 */

import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  ImageStyle,
} from "react-native";
import { Image } from "expo-image";
import { CivicReportCategory } from "../../types/report";
import {
  DISASTER_CATEGORY_PHOTOS,
  cleanVaultDisplayFilename,
  normalizeLocalFileUri,
  resolveLocalImageUriAsync,
} from "../../utils/reportMedia";

export type CivicImageProps = {
  uri: string | null | undefined;
  fallbackUri?: string | null;
  category?: CivicReportCategory;
  style?: StyleProp<ViewStyle | ImageStyle>;
  contentFit?: "cover" | "contain";
  accessibilityLabel?: string;
  compact?: boolean;
  label?: string;
};

const CATEGORY_VISUAL_THEME: Record<
  CivicReportCategory,
  { icon: string; title: string; bg: string; border: string; accent: string }
> = {
  "road-damage": {
    icon: "🚧",
    title: "Infrastruktur Jalan",
    bg: "#FFFBEB",
    border: "#FDE68A",
    accent: "#B45309",
  },
  flood: {
    icon: "🌊",
    title: "Genangan & Drainase",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    accent: "#1D4ED8",
  },
  landslide: {
    icon: "⚠️",
    title: "Mitigasi Longsor",
    bg: "#FEF2F2",
    border: "#FECACA",
    accent: "#B91C1C",
  },
  "street-light": {
    icon: "💡",
    title: "Penerangan Jalan (PJU)",
    bg: "#FEFCE8",
    border: "#FEF08A",
    accent: "#A16207",
  },
};

export const CivicImage = memo(function CivicImage({
  uri,
  fallbackUri,
  category = "road-damage",
  style,
  contentFit = "cover",
  accessibilityLabel,
  compact = false,
  label,
}: CivicImageProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [useVisualFallback, setUseVisualFallback] = useState<boolean>(false);

  const defaultCategoryFallback =
    fallbackUri !== undefined
      ? fallbackUri
      : DISASTER_CATEGORY_PHOTOS[category] || DISASTER_CATEGORY_PHOTOS["road-damage"];

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setUseVisualFallback(false);

    async function resolveSource() {
      if (!uri) {
        if (isMounted) {
          if (defaultCategoryFallback) {
            setResolvedUri(defaultCategoryFallback);
          } else {
            setResolvedUri(null);
            setUseVisualFallback(true);
            setIsLoading(false);
          }
        }
        return;
      }

      const normalized = normalizeLocalFileUri(uri) || uri;

      // Jika berkas lokal di Scoped Storage (file://), baca via ExpoFileSystem Base64
      if (normalized.startsWith("file://")) {
        const dataUri = await resolveLocalImageUriAsync(normalized);
        if (!isMounted) return;

        if (dataUri) {
          setResolvedUri(dataUri);
          return;
        }

        // Jika berkas lokal sudah dihapus atau tidak ada di perangkat ini, gunakan fallback kategori
        if (defaultCategoryFallback) {
          setResolvedUri(defaultCategoryFallback);
        } else {
          setResolvedUri(null);
          setUseVisualFallback(true);
          setIsLoading(false);
        }
        return;
      }

      // Jika URL remote (https://) atau data URI langsung
      if (isMounted) {
        setResolvedUri(normalized);
      }
    }

    resolveSource();

    return () => {
      isMounted = false;
    };
  }, [uri, defaultCategoryFallback]);

  const handleImageError = () => {
    // Jika URI utama gagal dan masih ada fallback kategori yang belum dicoba
    if (
      defaultCategoryFallback &&
      resolvedUri !== defaultCategoryFallback
    ) {
      setResolvedUri(defaultCategoryFallback);
      return;
    }
    setIsLoading(false);
    setUseVisualFallback(true);
  };

  const visualTheme =
    CATEGORY_VISUAL_THEME[category] || CATEGORY_VISUAL_THEME["road-damage"];
  const displayTitle =
    label || cleanVaultDisplayFilename(uri || "") || visualTheme.title;

  if (useVisualFallback || !resolvedUri) {
    if (compact) {
      return (
        <View
          style={[
            styles.compactFallbackBox,
            {
              backgroundColor: visualTheme.bg,
              borderColor: visualTheme.border,
            },
            style as StyleProp<ViewStyle>,
          ]}
          accessibilityLabel={accessibilityLabel || displayTitle}
        >
          <Text style={styles.compactFallbackIcon}>{visualTheme.icon}</Text>
          <Text
            style={[styles.compactFallbackText, { color: visualTheme.accent }]}
          >
            FOTO
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.fullFallbackBox,
          {
            backgroundColor: visualTheme.bg,
            borderColor: visualTheme.border,
          },
          style as StyleProp<ViewStyle>,
        ]}
        accessibilityLabel={accessibilityLabel || displayTitle}
      >
        <View style={styles.fullFallbackIconCircle}>
          <Text style={styles.fullFallbackIcon}>{visualTheme.icon}</Text>
        </View>
        <Text
          style={[styles.fullFallbackTitle, { color: visualTheme.accent }]}
          numberOfLines={1}
        >
          {displayTitle}
        </Text>
        <Text style={styles.fullFallbackSub}>
          📸 Visual Dokumentasi Mitigasi (SDG 11)
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style as StyleProp<ViewStyle>]}>
      <Image
        source={{ uri: resolvedUri }}
        style={styles.fillImage}
        contentFit={contentFit}
        transition={150}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleImageError}
        accessibilityLabel={accessibilityLabel || displayTitle}
      />
      {isLoading && !compact && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  fillImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 250, 252, 0.55)",
  },
  compactFallbackBox: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  compactFallbackIcon: {
    fontSize: 20,
    marginBottom: 1,
  },
  compactFallbackText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  fullFallbackBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  fullFallbackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fullFallbackIcon: {
    fontSize: 24,
  },
  fullFallbackTitle: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 3,
  },
  fullFallbackSub: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    textAlign: "center",
  },
});
