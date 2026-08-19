import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

// Canonical ratio heights for the 8 vertical slices of Tar mascot
const RATIOS = [1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 0.55, 0.35];
const TOTAL_RATIO = RATIOS.reduce((a, b) => a + b, 0);

interface TarLogoProps {
  size?: number;
  color?: string;
  bgColor?: string; // Background color for cutouts (default '#ffffff')
  style?: StyleProp<ViewStyle>;
}

export function TarLogo({
  size = 200,
  color = '#392878',
  bgColor = '#ffffff',
  style,
}: TarLogoProps) {
  const colW = size / 7;
  const unitH = size / TOTAL_RATIO;

  // Cumulative Y offsets
  const y0 = 0;
  const y1 = unitH * RATIOS[0];
  const y2 = y1 + unitH * RATIOS[1];
  const y3 = y2 + unitH * RATIOS[2];
  const y4 = y3 + unitH * RATIOS[3];
  const y6 = y4 + unitH * (RATIOS[4] + RATIOS[5]);
  const y7 = y6 + unitH * RATIOS[6];
  const yEnd = y7 + unitH * RATIOS[7];

  return (
    <View style={[{ width: size, height: yEnd, position: 'relative' }, style]}>
      {/* ── 1. ROW 0: EAR TIPS ── */}
      {/* Left Ear Tip (Cols 0..1) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: y0,
          width: colW * 2 + 0.5,
          height: y1 + 0.5,
          backgroundColor: color,
        }}
      />
      {/* Right Ear Tip (Cols 5..6) */}
      <View
        style={{
          position: 'absolute',
          left: colW * 5 - 0.25,
          top: y0,
          width: colW * 2 + 0.5,
          height: y1 + 0.5,
          backgroundColor: color,
        }}
      />

      {/* ── 2. SINGLE SOLID CONTIGUOUS MAIN HEAD & BODY (Row 1 through Row 5) ── */}
      {/* This is ONE single solid rectangle with ZERO internal horizontal or vertical seams */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: y1 - 0.5,
          width: size,
          height: y6 - y1 + 1.0,
          backgroundColor: color,
        }}
      />

      {/* ── 3. CUTOUTS ON THE MAIN BODY ── */}
      {/* Top-Left Ear Notch (Row 1: Col 0) */}
      <View
        style={{
          position: 'absolute',
          left: -0.5,
          top: y1 - 0.5,
          width: colW + 0.5,
          height: y2 - y1 + 0.5,
          backgroundColor: bgColor,
        }}
      />
      {/* Top-Right Ear Notch (Row 1: Col 6) */}
      <View
        style={{
          position: 'absolute',
          left: colW * 6 - 0.25,
          top: y1 - 0.5,
          width: colW + 0.5,
          height: y2 - y1 + 0.5,
          backgroundColor: bgColor,
        }}
      />
      {/* Left Eye Cutout (Row 3: Col 2) */}
      <View
        style={{
          position: 'absolute',
          left: colW * 2 - 0.25,
          top: y3 - 0.25,
          width: colW + 0.5,
          height: y4 - y3 + 0.5,
          backgroundColor: bgColor,
        }}
      />
      {/* Right Eye Cutout (Row 3: Col 4) */}
      <View
        style={{
          position: 'absolute',
          left: colW * 4 - 0.25,
          top: y3 - 0.25,
          width: colW + 0.5,
          height: y4 - y3 + 0.5,
          backgroundColor: bgColor,
        }}
      />

      {/* ── 4. ROW 6 & 7: FEET & CHIN EXTENSION ── */}
      {/* Left Foot (Col 0) */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: y6 - 0.5,
          width: colW + 0.25,
          height: y7 - y6 + 0.5,
          backgroundColor: color,
        }}
      />
      {/* Center Foot + Chin Extension (Col 3) */}
      <View
        style={{
          position: 'absolute',
          left: colW * 3 - 0.25,
          top: y6 - 0.5,
          width: colW + 0.5,
          height: yEnd - y6 + 0.5,
          backgroundColor: color,
        }}
      />
      {/* Right Foot (Col 6) */}
      <View
        style={{
          position: 'absolute',
          left: colW * 6 - 0.25,
          top: y6 - 0.5,
          width: colW + 0.5,
          height: y7 - y6 + 0.5,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export default TarLogo;
