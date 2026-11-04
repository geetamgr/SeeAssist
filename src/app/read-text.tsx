
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_BASE_URL = 'http://192.168.0.23:3001';

export default function ReadTextScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ language?: string }>();

  const language = params.language === 'ne' ? 'ne' : 'en';
  const isNepali = language === 'ne';
  const speechLanguage = isNepali ? 'ne-NP' : 'en-GB';

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const extractText = async () => {
    try {
      if (!cameraRef.current || !cameraReady) {
        Alert.alert(
          isNepali ? 'क्यामेरा तयार छैन' : 'Camera not ready',
          isNepali
            ? 'कृपया केही समय पर्खनुहोस् र फेरि प्रयास गर्नुहोस्।'
            : 'Please wait a moment and try again.'
        );
        return;
      }

      setLoading(true);
      Speech.stop();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (!photo?.uri) {
        throw new Error('The camera could not capture the photograph.');
      }

      const imageBase64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(`${API_BASE_URL}/api/read-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Text extraction failed.');
      }

      setExtractedText(data.text || '');

      if (!data.text?.trim()) {
        Alert.alert(
          isNepali ? 'पाठ फेला परेन' : 'No text found',
          isNepali
            ? 'स्पष्ट र राम्रो प्रकाश भएको पाठको अर्को फोटो खिच्नुहोस्।'
            : 'Try another photograph with clearer, well-lit text.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        isNepali ? 'पाठ निकाल्न सकिएन' : 'Unable to extract text',
        error.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const readAloud = () => {
    if (!extractedText.trim()) {
      Alert.alert(
        isNepali ? 'पाठ उपलब्ध छैन' : 'No text available',
        isNepali
          ? 'पहिले फोटोबाट पाठ निकाल्नुहोस्।'
          : 'Extract text from a photograph first.'
      );
      return;
    }

    Speech.stop();
    Speech.speak(extractedText, {
      language: speechLanguage,
      rate: 0.85,
      pitch: 1.0,
    });
  };

  const stopReading = () => {
    Speech.stop();
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionCard}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>
              {isNepali ? '‹ गृहपृष्ठमा फर्कनुहोस्' : '‹ Back to Home'}
            </Text>
          </Pressable>

          <Text style={styles.title}>
            {isNepali ? 'क्यामेरा अनुमति' : 'Camera Permission'}
          </Text>

          <Text style={styles.subtitle}>
            {isNepali
              ? 'फोटो खिच्न र छापिएको पाठ पढ्न SeeAssist लाई क्यामेरा अनुमति चाहिन्छ।'
              : 'SeeAssist needs camera access to photograph and read printed text.'}
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>
              {isNepali ? 'क्यामेरा अनुमति दिनुहोस्' : 'Allow Camera Access'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            {isNepali ? '‹ गृहपृष्ठमा फर्कनुहोस्' : '‹ Back to Home'}
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {isNepali ? 'पाठ पढ्नुहोस्' : 'Read Text'}
        </Text>

        <Text style={styles.subtitle}>
          {isNepali
            ? 'कागजात, संकेत वा लेबलको फोटो खिच्नुहोस्। SeeAssist ले शब्दहरू निकालेर ठूलो स्वरमा पढ्नेछ।'
            : 'Photograph a document, sign or label. SeeAssist will extract the words and read them aloud.'}
        </Text>

        <View style={styles.cameraCard}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            (!cameraReady || loading) && styles.disabledButton,
          ]}
          onPress={extractText}
          disabled={!cameraReady || loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.buttonText}>
                {isNepali ? 'पाठ निकाल्दै...' : ' Extracting Text...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {isNepali ? 'फोटो खिच्नुहोस् र पाठ निकाल्नुहोस्' : 'Capture & Extract Text'}
            </Text>
          )}
        </Pressable>

        <View style={styles.textCard}>
          <Text style={styles.sectionTitle}>
            {isNepali ? 'निकालिएको पाठ' : 'Extracted Text'}
          </Text>

          <Text style={extractedText ? styles.extractedText : styles.placeholder}>
            {extractedText ||
              (isNepali
                ? 'तपाईंले निकालेको पाठ यहाँ देखिनेछ।'
                : 'Your extracted text will appear here.')}
          </Text>
        </View>

        <Pressable style={styles.secondaryButton} onPress={readAloud}>
          <Text style={styles.secondaryButtonText}>
            {isNepali ? 'ठूलो स्वरमा पढ्नुहोस्' : 'Read Aloud'}
          </Text>
        </Pressable>

        <Pressable style={styles.stopButton} onPress={stopReading}>
          <Text style={styles.stopButtonText}>
            {isNepali ? 'पढ्न रोक्नुहोस्' : 'Stop Reading'}
          </Text>
        </Pressable>

        <Text style={styles.note}>
          {isNepali
            ? 'राम्रो नतिजाका लागि पाठमा पर्याप्त प्रकाश पार्नुहोस् र क्यामेरा स्थिर राख्नुहोस्।'
            : 'For clearer results, keep the text well lit and hold the camera steady.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  content: {
    padding: 20,
    paddingTop: 30,
  },
  permissionCard: {
    padding: 24,
    justifyContent: 'center',
    flex: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCEBFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 18,
  },
  backButtonText: {
    color: '#14558C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#12345A',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#526477',
    marginBottom: 20,
  },
  cameraCard: {
    overflow: 'hidden',
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#DCE6F2',
  },
  camera: {
    width: '100%',
    height: 280,
  },
  primaryButton: {
    backgroundColor: '#1769AA',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    minHeight: 150,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCE6F2',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#12345A',
    marginBottom: 12,
  },
  extractedText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#304A65',
  },
  placeholder: {
    fontSize: 16,
    lineHeight: 24,
    color: '#8795A5',
  },
  secondaryButton: {
    backgroundColor: '#DCEBFF',
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#14558C',
    fontSize: 17,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE6F2',
  },
  stopButtonText: {
    color: '#526477',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 13,
    marginTop: 18,
    lineHeight: 20,
  },
});
