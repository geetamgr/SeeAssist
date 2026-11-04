
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Language = 'en' | 'ne';

type FeatureButtonProps = {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
};

function FeatureButton({
  title,
  description,
  icon,
  onPress,
}: FeatureButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.featureButton,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
    >
      <Text style={styles.featureIcon}>{icon}</Text>

      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [language, setLanguage] = useState<Language>('en');

  const isNepali = language === 'ne';

  const openFeature = (path: string) => {
    router.push({
      pathname: path as any,
      params: { language },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>SeeAssist</Text>

          <Text style={styles.tagline}>
            {isNepali
              ? 'आत्मविश्वासका साथ आफ्नो संसार बुझ्नुहोस्।'
              : 'Understand your world with confidence.'}
          </Text>
        </View>

        {/* Language selector */}
        <View style={styles.languageCard}>
          <Text style={styles.languageTitle}>
            {isNepali ? 'आफ्नो भाषा छान्नुहोस्' : 'Choose your language'}
          </Text>

          <View style={styles.languageButtons}>
            <Pressable
              style={[
                styles.languageButton,
                language === 'en' && styles.selectedLanguage,
              ]}
              onPress={() => setLanguage('en')}
              accessibilityRole="button"
              accessibilityState={{ selected: language === 'en' }}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === 'en' && styles.selectedLanguageText,
                ]}
              >
                English
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.languageButton,
                language === 'ne' && styles.selectedLanguage,
              ]}
              onPress={() => setLanguage('ne')}
              accessibilityRole="button"
              accessibilityState={{ selected: language === 'ne' }}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === 'ne' && styles.selectedLanguageText,
                ]}
              >
                नेपाली
              </Text>
            </Pressable>
          </View>

          <Text style={styles.selectedLanguageLabel}>
            {isNepali
              ? 'चयन गरिएको भाषा: नेपाली'
              : 'Selected language: English'}
          </Text>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>
            {isNepali ? 'नमस्कार! स्वागत छ 👋' : 'Hello! Welcome 👋'}
          </Text>

          <Text style={styles.welcomeDescription}>
            {isNepali
              ? 'म तपाईंलाई वरपरको वातावरण बुझ्न, पाठ पढ्न र आवाजमार्फत प्रश्नहरूको उत्तर पाउन मद्दत गर्छु।'
              : "I'm here to help you understand your surroundings, read text and get answers through your voice."}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          {isNepali
            ? 'तपाईं के गर्न चाहनुहुन्छ?'
            : 'What would you like to do?'}
        </Text>

        <FeatureButton
          icon="📷"
          title={
            isNepali ? 'वरपरको वातावरण बुझ्नुहोस्' : 'Describe Surroundings'
          }
          description={
            isNepali
              ? 'क्यामेरा प्रयोग गरेर आफ्नो वरपर के छ बुझ्नुहोस्।'
              : "Use your camera to understand what's around you."
          }
          onPress={() => openFeature('/camera')}
        />

        <FeatureButton
          icon="📖"
          title={isNepali ? 'पाठ पढ्नुहोस्' : 'Read Text'}
          description={
            isNepali
              ? 'साइनबोर्ड, कागजात र उत्पादनका लेबलहरू पढ्नुहोस्।'
              : 'Read signs, documents and product labels.'
          }
          onPress={() => openFeature('/read-text')}
        />

        <FeatureButton
          icon="🎤"
          title={isNepali ? 'प्रश्न सोध्नुहोस्' : 'Ask a Question'}
          description={
            isNepali
              ? 'आफ्नो आवाज प्रयोग गरेर प्रश्न सोध्नुहोस्।'
              : 'Ask questions using your voice.'
          }
          onPress={() => openFeature('/voice-question')}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isNepali
              ? 'दैनिक जीवनलाई अझ पहुँचयोग्य बनाउन डिजाइन गरिएको।'
              : 'Designed to make everyday life more accessible.'}
          </Text>

          <Text style={styles.version}>
            SeeAssist • Version 1.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    padding: 22,
    paddingBottom: 35,
  },
  header: {
    marginTop: 15,
    marginBottom: 22,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#173B70',
  },
  tagline: {
    fontSize: 15,
    color: '#526174',
    marginTop: 6,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  languageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#173B70',
    marginBottom: 12,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#B8C7D9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  selectedLanguage: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#173B70',
  },
  selectedLanguageText: {
    color: '#FFFFFF',
  },
  selectedLanguageLabel: {
    marginTop: 12,
    fontSize: 13,
    color: '#526174',
  },
  welcome: {
    backgroundColor: '#173B70',
    padding: 22,
    borderRadius: 18,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    lineHeight: 25,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#172B45',
    marginBottom: 16,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    minHeight: 105,
  },
  buttonPressed: {
    backgroundColor: '#E8F0FA',
    opacity: 0.85,
  },
  featureIcon: {
    fontSize: 34,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#173B70',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#526174',
  },
  arrow: {
    fontSize: 30,
    color: '#173B70',
    marginLeft: 8,
  },
  footer: {
    marginTop: 25,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#526174',
    textAlign: 'center',
  },
  version: {
    fontSize: 12,
    color: '#8290A0',
    marginTop: 10,
  },
});
