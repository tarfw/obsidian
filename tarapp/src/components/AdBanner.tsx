import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/use-theme';

const ADS = [
  {
    title: 'Neon · Serverless Postgres in seconds',
    url: 'https://neon.tech',
    logoUri: 'https://neon.tech/favicon/favicon.png',
    accentColor: '#00e599',
    fallbackLetter: 'N',
  },
  {
    title: 'Vercel · Deploy frontend apps instantly',
    url: 'https://vercel.com',
    logoUri: 'https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico',
    accentColor: '#000000',
    fallbackLetter: '▲',
  },
  {
    title: 'Railway · Ship apps faster with ease',
    url: 'https://railway.com',
    logoUri: 'https://railway.com/favicon.ico',
    accentColor: '#a855f7',
    fallbackLetter: 'R',
  },
];

function AdLogo({ logoUri, accentColor, fallbackLetter, onError }: { logoUri: string; accentColor: string; fallbackLetter: string; onError: () => void }) {
  return (
    <Image
      source={{ uri: logoUri }}
      style={styles.logoImage}
      onError={onError}
      resizeMode="contain"
    />
  );
}

function AdFallback({ accentColor, fallbackLetter }: { accentColor: string; fallbackLetter: string }) {
  return (
    <View style={[styles.vectorBox, { backgroundColor: accentColor }]}>
      <View style={styles.innerBorder}>
        <Text style={styles.fallbackText}>{fallbackLetter}</Text>
      </View>
    </View>
  );
}

export default function AdBanner() {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const ad = ADS[currentIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ADS.length);
      setImageError(false);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(ad.url);
      if (supported) {
        await Linking.openURL(ad.url);
      } else {
        Alert.alert(ad.title, ad.url);
      }
    } catch {
      Alert.alert(ad.title, ad.url);
    }
  }, [ad.url, ad.title]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bannerContainer,
        {
          borderColor: theme.border,
        },
        pressed && { opacity: 0.8 },
      ]}
      onPress={handleOpen}
    >
      {/* Official Logo */}
      <View style={styles.logoWrapper}>
        {imageError ? (
          <AdFallback accentColor={ad.accentColor} fallbackLetter={ad.fallbackLetter} />
        ) : (
          <AdLogo
            logoUri={ad.logoUri}
            accentColor={ad.accentColor}
            fallbackLetter={ad.fallbackLetter}
            onError={() => setImageError(true)}
          />
        )}
      </View>

      {/* Middle Headline Title */}
      <View style={styles.textContent}>
        <Text style={[styles.headlineText, { color: theme.text }]} numberOfLines={1}>
          {ad.title}
        </Text>
      </View>

      {/* External Link Arrow Icon */}
      <View style={styles.actionsRow}>
        <Ionicons name="open-outline" size={14} color={theme.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoWrapper: {
    width: 28,
    height: 28,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  vectorBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#00e599',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  innerBorder: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: -1,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  headlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.1,
  },
  actionsRow: {
    paddingLeft: 4,
  },
});
