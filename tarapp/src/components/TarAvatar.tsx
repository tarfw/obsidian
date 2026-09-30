import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type TarAvatarExpression = 'dots' | 'happy' | 'bee';

export interface TarAvatarProps {
  size?: number;
  bgColor?: string;
  eyeColor?: string;
  expression?: TarAvatarExpression;
  style?: StyleProp<ViewStyle>;
}

/**
 * Minimal Codex/Grok style Squircle Bot Avatar for TAR & Ask TAR.
 * Features a soft pastel squircle with the iconic two expressive eye dots.
 */
export function TarAvatar({
  size = 24,
  bgColor = '#D8B4FE', // Soft lilac/lavender from user reference
  eyeColor = '#111827', // Deep charcoal/black
  expression = 'happy',
  style,
}: TarAvatarProps) {
  const squircleRadius = Math.round(size * 0.28);
  const eyeSize = Math.max(3, Math.round(size * 0.26));
  const eyeRadius = eyeSize / 2;
  const eyeGap = Math.max(2, Math.round(size * 0.14));

  // Happy curved eye strokes (^ ^)
  const eyeArcStroke = Math.max(1.6, Math.round(size * 0.08));

  // Subtle smile for 'happy' / 'bee'
  const smileW = Math.max(4, Math.round(size * 0.22));
  const smileH = Math.max(2, Math.round(size * 0.1));
  const smileStroke = Math.max(1.2, Math.round(size * 0.065));

  // Antennae nubs for 'bee'
  const antW = Math.max(1.5, Math.round(size * 0.08));
  const antH = Math.max(2.5, Math.round(size * 0.16));

  return (
    <View
      style={[
        styles.squircle,
        {
          width: size,
          height: size,
          borderRadius: squircleRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      {/* Optional Bee Antennae Nubs */}
      {expression === 'bee' ? (
        <View style={styles.antennaRow}>
          <View
            style={[
              styles.antenna,
              {
                width: antW,
                height: antH,
                borderRadius: antW / 2,
                backgroundColor: eyeColor,
                transform: [{ rotate: '-15deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.antenna,
              {
                width: antW,
                height: antH,
                borderRadius: antW / 2,
                backgroundColor: eyeColor,
                transform: [{ rotate: '15deg' }],
              },
            ]}
          />
        </View>
      ) : null}

      {/* Two Eyes */}
      <View style={[styles.eyesRow, { gap: eyeGap }]}>
        {expression === 'happy' ? (
          <>
            {/* Left Happy Eye (^ ^) */}
            <View
              style={[
                styles.happyEye,
                {
                  width: eyeSize,
                  height: eyeSize * 0.7,
                  borderTopWidth: eyeArcStroke,
                  borderTopColor: eyeColor,
                  borderTopLeftRadius: eyeSize * 0.55,
                  borderTopRightRadius: eyeSize * 0.55,
                },
              ]}
            />
            {/* Right Happy Eye (^ ^) */}
            <View
              style={[
                styles.happyEye,
                {
                  width: eyeSize,
                  height: eyeSize * 0.7,
                  borderTopWidth: eyeArcStroke,
                  borderTopColor: eyeColor,
                  borderTopLeftRadius: eyeSize * 0.55,
                  borderTopRightRadius: eyeSize * 0.55,
                },
              ]}
            />
          </>
        ) : (
          <>
            {/* Left Round Eye Dot */}
            <View
              style={[
                styles.dotEye,
                {
                  width: eyeSize,
                  height: eyeSize,
                  borderRadius: eyeRadius,
                  backgroundColor: eyeColor,
                },
              ]}
            />
            {/* Right Round Eye Dot */}
            <View
              style={[
                styles.dotEye,
                {
                  width: eyeSize,
                  height: eyeSize,
                  borderRadius: eyeRadius,
                  backgroundColor: eyeColor,
                },
              ]}
            />
          </>
        )}
      </View>

      {/* Optional Gentle Smile for 'bee' mode */}
      {expression === 'bee' ? (
        <View
          style={[
            styles.smile,
            {
              width: smileW,
              height: smileH,
              borderBottomWidth: smileStroke,
              borderBottomColor: eyeColor,
              borderBottomLeftRadius: smileW * 0.5,
              borderBottomRightRadius: smileW * 0.5,
              marginTop: Math.max(1, Math.round(size * 0.04)),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  squircle: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  antennaRow: {
    position: 'absolute',
    top: '12%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '44%',
  },
  antenna: {},
  eyesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEye: {},
  happyEye: {
    backgroundColor: 'transparent',
  },
  smile: {
    backgroundColor: 'transparent',
  },
});

export default TarAvatar;
