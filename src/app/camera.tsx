
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const params = useLocalSearchParams<{ language?: string }>();

  const language = params.language === 'ne' ? 'ne' : 'en';
  const isNepali = language === 'ne';

  const speechLanguage = isNepali ? 'ne-NP' : 'en-GB';

  const [permission, requestPermission] = useCameraPermissions();

  const [photo, setPhoto] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>
          {isNepali
            ? 'क्यामेराको अनुमति लोड हुँदैछ...'
            : 'Loading camera permission...'}
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>
          {isNepali ? 'क्यामेरा पहुँच' : 'Camera Access'}
        </Text>

        <Text style={styles.description}>
          {isNepali
            ? 'तपाईंको वरपरको वातावरण बुझ्न SeeAssist लाई क्यामेरा पहुँच आवश्यक छ।'
            : 'SeeAssist needs camera access to help you understand your surroundings.'}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>
            {isNepali
              ? 'क्यामेरा अनुमति दिनुहोस्'
              : 'Allow Camera Access'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>
            {isNepali ? 'पछाडि जानुहोस्' : 'Go Back'}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    try {
      setDescription(null);

      const result = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
      });

      if (result?.uri) {
        setPhoto(result.uri);
      }
    } catch (error) {
      Alert.alert(
        isNepali ? 'क्यामेरा त्रुटि' : 'Camera Error',
        isNepali
          ? 'फोटो खिच्न सकिएन।'
          : 'Unable to capture the photograph.'
      );
    }
  };

  const retakePicture = async () => {
    await Speech.stop();
    setSpeaking(false);
    setDescription(null);
    setPhoto(null);
  };

  const analysePicture = async () => {
    if (!photo || analysing) {
      return;
    }

    setAnalysing(true);
    setDescription(null);

    try {
      const imageBase64 = await FileSystem.readAsStringAsync(
        photo,
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

      const response = await fetch(
        'http://192.168.0.23:3001/api/analyze',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64,
            mimeType: 'image/jpeg',
            language,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Photo analysis failed.'
        );
      }

      if (!data.description) {
        throw new Error('No description was returned.');
      }

      setDescription(data.description);

    } catch (error) {
      console.error('Photo analysis error:', error);

      Alert.alert(
        isNepali ? 'विश्लेषण त्रुटि' : 'Analysis Error',
        error instanceof Error
          ? error.message
          : isNepali
            ? 'फोटो विश्लेषण गर्न सकिएन। फेरि प्रयास गर्नुहोस्।'
            : 'Unable to analyse the photograph. Please try again.'
      );

    } finally {
      setAnalysing(false);
    }
  };

  const speakDescription = async () => {
    if (!description) {
      return;
    }

    try {
      await Speech.stop();
      setSpeaking(true);

      Speech.speak(description, {
        language: speechLanguage,
        rate: 0.9,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => {
          setSpeaking(false);

          Alert.alert(
            isNepali ? 'आवाज त्रुटि' : 'Speech Error',
            isNepali
              ? 'विवरण ठूलो आवाजमा पढ्न सकिएन।'
              : 'Unable to read the description aloud.'
          );
        },
      });

    } catch (error) {
      setSpeaking(false);

      Alert.alert(
        isNepali ? 'आवाज त्रुटि' : 'Speech Error',
        isNepali
          ? 'आवाज सुरु गर्न सकिएन।'
          : 'Unable to start speech.'
      );
    }
  };

  const stopSpeaking = async () => {
    await Speech.stop();
    setSpeaking(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          disabled={analysing}
        >
          <Text style={styles.backText}>‹ {isNepali ? 'पछाडि' : 'Back'}</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          {isNepali
            ? 'वरपरको वातावरण बुझ्नुहोस्'
            : 'Describe Surroundings'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.instruction}>
          {photo
            ? isNepali
              ? 'आफ्नो फोटो हेर्नुहोस्'
              : 'Review your photograph'
            : isNepali
              ? 'वस्तु वा वरपरको वातावरणतर्फ क्यामेरा देखाउनुहोस्'
              : 'Point your camera towards the object or surroundings'}
        </Text>

        <View style={styles.cameraContainer}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.preview}
              resizeMode="contain"
              accessibilityLabel="Captured photograph preview"
            />
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
            />
          )}
        </View>

        {photo && (
          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={retakePicture}
              disabled={analysing}
            >
              <Text style={styles.buttonText}>
                {isNepali ? 'फेरि फोटो खिच्नुहोस्' : 'Retake Photo'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                analysing && styles.disabledButton,
              ]}
              onPress={analysePicture}
              disabled={analysing}
            >
              {analysing ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {isNepali ? 'विश्लेषण हुँदैछ...' : 'Analysing...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {isNepali ? 'फोटो विश्लेषण गर्नुहोस्' : 'Analyse Photo'}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {!photo && (
          <Pressable
            style={styles.captureButton}
            onPress={takePicture}
            accessibilityRole="button"
            accessibilityLabel={
              isNepali ? 'फोटो खिच्नुहोस्' : 'Take photograph'
            }
          >
            <View style={styles.captureInner} />
          </Pressable>
        )}

        {description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionHeading}>
              {isNepali
                ? 'SeeAssist ले के देख्छ'
                : 'What SeeAssist sees'}
            </Text>

            <Text
              style={styles.descriptionText}
              accessibilityLiveRegion="polite"
            >
              {description}
            </Text>

            <Pressable
              style={styles.speechButton}
              onPress={
                speaking ? stopSpeaking : speakDescription
              }
              accessibilityRole="button"
              accessibilityLabel={
                speaking
                  ? isNepali
                    ? 'आवाज रोक्नुहोस्'
                    : 'Stop speaking'
                  : isNepali
                    ? 'विवरण सुन्नुहोस्'
                    : 'Listen to description'
              }
            >
              <Text style={styles.buttonText}>
                {speaking
                  ? isNepali
                    ? 'आवाज रोक्नुहोस्'
                    : 'Stop Speaking'
                  : isNepali
                    ? 'विवरण सुन्नुहोस्'
                    : 'Listen to Description'}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.footer}>
          {isNepali
            ? 'SeeAssist एउटा सहायक उपकरण हो। यो सेतो छडी वा मार्गदर्शक कुकुरको विकल्प होइन। वरपरका जोखिमहरू सधैँ आफैँ जाँच गर्नुहोस्।'
            : 'SeeAssist is an assistive tool, not a replacement for a white cane or guide dog. Always verify hazards independently.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 18,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#F7F9FC',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#173B70',
    marginLeft: 18,
    flex: 1,
  },

  backText: {
    fontSize: 18,
    color: '#173B70',
    fontWeight: '700',
    marginVertical: 15,
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#173B70',
    marginBottom: 12,
  },

  instruction: {
    fontSize: 17,
    lineHeight: 24,
    color: '#26384D',
    textAlign: 'center',
    marginBottom: 16,
  },

  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 25,
    color: '#526174',
  },

  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },

  cameraContainer: {
    height: 360,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#172B45',
  },

  camera: {
    flex: 1,
  },

  preview: {
    width: '100%',
    height: '100%',
  },

  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: '#173B70',
    alignSelf: 'center',
    marginTop: 25,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#173B70',
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  primaryButton: {
    backgroundColor: '#173B70',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginBottom: 12,
  },

  secondaryButton: {
    backgroundColor: '#526174',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginBottom: 12,
  },

  disabledButton: {
    opacity: 0.65,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  descriptionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E1E7EF',
  },

  descriptionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#173B70',
    marginBottom: 8,
  },

  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#26384D',
  },

  speechButton: {
    backgroundColor: '#173B70',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: '#526174',
    textAlign: 'center',
    marginTop: 18,
  },
});
