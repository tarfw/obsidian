import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { TarLogo } from './TarLogo';

export type AgentRoleType = 'sales_agent' | 'workspace_agent' | 'ocr_agent' | 'lead_hunter' | 'sandbox_agent';
export type AgentStateMode = 'idle' | 'active' | 'generating' | 'success';

interface AnimatedTarLogoAgentProps {
  size?: number;
  role?: AgentRoleType;
  mode?: AgentStateMode;
  style?: StyleProp<ViewStyle>;
  showBadge?: boolean;
}

const ROLE_COLORS: Record<
  AgentRoleType,
  { primary: string; wingColor: string; dustColor: string }
> = {
  workspace_agent: {
    primary: '#1E40AF', // Deep Dark Blue
    wingColor: 'rgba(30, 64, 175, 0.22)',
    dustColor: 'rgba(30, 64, 175, 0.35)',
  },
  sales_agent: {
    primary: '#10B981', // Emerald
    wingColor: 'rgba(16, 185, 129, 0.30)',
    dustColor: 'rgba(16, 185, 129, 0.55)',
  },
  ocr_agent: {
    primary: '#8B5CF6',
    wingColor: 'rgba(139, 92, 246, 0.25)',
    dustColor: 'rgba(139, 92, 246, 0.4)',
  },
  lead_hunter: {
    primary: '#F97316',
    wingColor: 'rgba(249, 115, 22, 0.25)',
    dustColor: 'rgba(249, 115, 22, 0.4)',
  },
  sandbox_agent: {
    primary: '#06B6D4',
    wingColor: 'rgba(6, 182, 212, 0.25)',
    dustColor: 'rgba(6, 182, 212, 0.4)',
  },
};

export function AnimatedTarLogoAgent({
  size = 90,
  role = 'workspace_agent',
  mode = 'active',
  style,
}: AnimatedTarLogoAgentProps) {
  const config = ROLE_COLORS[role] || ROLE_COLORS.workspace_agent;
  const isWorkspace = role === 'workspace_agent';
  const isSales = role === 'sales_agent';

  // 1. Vertical Hover
  const hoverAnim = useRef(new Animated.Value(0)).current;
  // 2. Horizontal Sway (Sales Agent)
  const swayAnim = useRef(new Animated.Value(0)).current;
  // 3. Aeronautic Banking Tilt
  const tiltAnim = useRef(new Animated.Value(0)).current;
  // 4. Primary Wings Flutter
  const wingFlutter = useRef(new Animated.Value(0)).current;
  // 5. Secondary Lower Wings (Sales Upgrade)
  const lowerWingFlutter = useRef(new Animated.Value(0)).current;
  // 6. Floating Pixel Particles (Pollen / Sales Sparkles)
  const pAnim1 = useRef(new Animated.Value(0)).current;
  const pAnim2 = useRef(new Animated.Value(0)).current;
  const pAnim3 = useRef(new Animated.Value(0)).current;
  const pAnim4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Vertical Hover Floating
    const hover = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: 1,
          duration: isSales ? 1100 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: isSales ? 1100 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Horizontal Glide Sway (Figure-8 active flight for Sales)
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Banking Tilt
    const tilt = Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, {
          toValue: 1,
          duration: isSales ? 1400 : 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tiltAnim, {
          toValue: -1,
          duration: isSales ? 1400 : 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 4. Primary Wing Flutter
    const wings = Animated.loop(
      Animated.sequence([
        Animated.timing(wingFlutter, {
          toValue: 1,
          duration: isSales ? 70 : 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wingFlutter, {
          toValue: 0,
          duration: isSales ? 70 : 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    // 5. Lower Wings Flutter (Sales)
    const lowerWings = Animated.loop(
      Animated.sequence([
        Animated.timing(lowerWingFlutter, {
          toValue: 1,
          duration: 85,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(lowerWingFlutter, {
          toValue: 0,
          duration: 85,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    // 6. Floating Pixel Sparkles / Pollen Trails
    const p1 = Animated.loop(
      Animated.timing(pAnim1, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    const p2 = Animated.loop(
      Animated.timing(pAnim2, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    const p3 = Animated.loop(
      Animated.timing(pAnim3, {
        toValue: 1,
        duration: 2300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    const p4 = Animated.loop(
      Animated.timing(pAnim4, {
        toValue: 1,
        duration: 1900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    hover.start();
    tilt.start();
    wings.start();
    p1.start();
    p2.start();
    p3.start();

    if (isSales) {
      sway.start();
      lowerWings.start();
      p4.start();
    }

    return () => {
      hover.stop();
      sway.stop();
      tilt.stop();
      wings.stop();
      lowerWings.stop();
      p1.stop();
      p2.stop();
      p3.stop();
      p4.stop();
    };
  }, [hoverAnim, swayAnim, tiltAnim, wingFlutter, lowerWingFlutter, pAnim1, pAnim2, pAnim3, pAnim4, isWorkspace, isSales, mode]);

  // Transform Interpolations
  const translateY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isSales ? [-6, 6] : [-4.5, 4.5],
  });

  const translateX = isSales
    ? swayAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: [-7, 7],
      })
    : 0;

  const rotateZ = tiltAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: isSales ? ['-4deg', '4deg'] : ['-2.5deg', '2.5deg'],
  });

  const leftWingScale = wingFlutter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.18],
  });

  const rightWingScale = wingFlutter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.18],
  });

  const lowerLeftWingScale = lowerWingFlutter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1.12],
  });

  const lowerRightWingScale = lowerWingFlutter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1.12],
  });

  const containerSize = size * 1.5;
  const wingWidth = size * 0.40;
  const wingHeight = size * 0.28;
  const lowerWingWidth = size * 0.30;
  const lowerWingHeight = size * 0.20;

  return (
    <View style={[styles.wrapper, { width: containerSize, height: containerSize }, style]}>
      {/* ── FLOATING PIXEL SPARKLES / POLLEN ── */}
      {/* Particle 1: Left */}
      <Animated.View
        style={[
          styles.pixelSparkle,
          {
            backgroundColor: config.dustColor,
            left: '20%',
            bottom: '24%',
            opacity: pAnim1.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, 0.85, 0],
            }),
            transform: [
              {
                translateY: pAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -36],
                }),
              },
              {
                scale: pAnim1.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.6, 1.2, 0.4],
                }),
              },
            ],
          },
        ]}
      />

      {/* Particle 2: Right */}
      <Animated.View
        style={[
          styles.pixelSparkle,
          {
            backgroundColor: config.dustColor,
            right: '18%',
            bottom: '28%',
            opacity: pAnim2.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, 0.8, 0],
            }),
            transform: [
              {
                translateY: pAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -30],
                }),
              },
              {
                scale: pAnim2.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.6, 1.2, 0.4],
                }),
              },
            ],
          },
        ]}
      />

      {/* Particle 3: Center Tail */}
      <Animated.View
        style={[
          styles.pixelSparkle,
          {
            backgroundColor: config.dustColor,
            left: '48%',
            bottom: '14%',
            opacity: pAnim3.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, 0.7, 0],
            }),
            transform: [
              {
                translateY: pAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -28],
                }),
              },
            ],
          },
        ]}
      />

      {/* Particle 4: Sales Supercharged Glint */}
      {isSales && (
        <Animated.View
          style={[
            styles.pixelSparkle,
            {
              backgroundColor: '#34D399',
              right: '28%',
              bottom: '18%',
              opacity: pAnim4.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.9, 0],
              }),
              transform: [
                {
                  translateY: pAnim4.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -32],
                  }),
                },
                {
                  rotate: '45deg',
                },
              ],
            },
          ]}
        />
      )}

      {/* ── FLYING BEE RIG (HOVER + SWAY + TILT + MULTI-TIER WINGS + MASCOT) ── */}
      <Animated.View
        style={[
          styles.flyingBeeRig,
          {
            transform: [
              { translateY },
              { translateX },
              { rotate: rotateZ },
            ],
          },
        ]}
      >
        {/* Upper Left Wing (Positioned outside the body so borders never cross eye cutouts) */}
        <Animated.View
          style={[
            styles.beeWing,
            styles.leftWing,
            {
              width: wingWidth,
              height: wingHeight,
              backgroundColor: config.wingColor,
              borderColor: config.primary,
              top: size * 0.12,
              left: (containerSize - size) / 2 - wingWidth * 0.88,
              transform: [
                { rotate: '-30deg' },
                { scaleX: leftWingScale },
              ],
            },
          ]}
        />

        {/* Upper Right Wing (Positioned outside the body) */}
        <Animated.View
          style={[
            styles.beeWing,
            styles.rightWing,
            {
              width: wingWidth,
              height: wingHeight,
              backgroundColor: config.wingColor,
              borderColor: config.primary,
              top: size * 0.12,
              right: (containerSize - size) / 2 - wingWidth * 0.88,
              transform: [
                { rotate: '30deg' },
                { scaleX: rightWingScale },
              ],
            },
          ]}
        />

        {/* Lower Left Wing (Sales Upgrade) */}
        {isSales && (
          <Animated.View
            style={[
              styles.beeWing,
              styles.leftWing,
              {
                width: lowerWingWidth,
                height: lowerWingHeight,
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                borderColor: 'rgba(16, 185, 129, 0.45)',
                top: size * 0.35,
                left: (containerSize - size) / 2 - lowerWingWidth * 0.82,
                transform: [
                  { rotate: '-16deg' },
                  { scaleX: lowerLeftWingScale },
                ],
              },
            ]}
          />
        )}

        {/* Lower Right Wing (Sales Upgrade) */}
        {isSales && (
          <Animated.View
            style={[
              styles.beeWing,
              styles.rightWing,
              {
                width: lowerWingWidth,
                height: lowerWingHeight,
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                borderColor: 'rgba(16, 185, 129, 0.45)',
                top: size * 0.35,
                right: (containerSize - size) / 2 - lowerWingWidth * 0.82,
                transform: [
                  { rotate: '16deg' },
                  { scaleX: lowerRightWingScale },
                ],
              },
            ]}
          />
        )}

        {/* Solid Mascot Housing */}
        <View style={styles.mascotBox}>
          <TarLogo size={size} color={config.primary} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pixelSparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 1,
  },
  flyingBeeRig: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  beeWing: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 1,
  },
  leftWing: {
    transformOrigin: 'right center',
  },
  rightWing: {
    transformOrigin: 'left center',
  },
  mascotBox: {
    zIndex: 10,
  },
});

export default AnimatedTarLogoAgent;
