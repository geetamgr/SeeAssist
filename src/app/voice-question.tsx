
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';

import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

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

export default function VoiceQuestionScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ language?: string }>();

  const language = params.language === 'ne' ? 'ne' : 'en';
  const isNepali = language === 'ne';

  const speechLanguage = isNepali ? 'ne-NP' : 'en-GB';

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
  });

  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');

  // Start recording
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          isNepali
            ? 'माइक्रोफोन अनुमति आवश्यक छ'
            : 'Microphone permission required',
          isNepali
            ? 'SeeAssist लाई प्रश्न सोध्न माइक्रोफोन पहुँच दिनुहोस्।'
            : 'Please allow microphone access to ask SeeAssist a question.'
        );
        return;
      }

      await Speech.stop();

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setTranscript('');
      setAnswer('');
      setAudioUri(null);

      await stream.start();

      await stream.startFileRecordingAsync({
        format: 'wav',
      });

      setRecording(true);
    } catch (error: any) {
      Alert.alert(
        isNepali ? 'रेकर्डिङ त्रुटि' : 'Recording error',
        error.message || (
          isNepali
            ? 'रेकर्डिङ सुरु गर्न सकिएन।'
            : 'Unable to start recording.'
        )
      );
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      const result = await stream.stopFileRecordingAsync();

      await stream.stop();

      setAudioUri(result.uri);
      setRecording(false);

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (error: any) {
      setRecording(false);

      Alert.alert(
        isNepali ? 'रेकर्डिङ त्रुटि' : 'Recording error',
        error.message || (
          isNepali
            ? 'रेकर्डिङ रोक्न सकिएन।'
            : 'Unable to stop recording.'
        )
      );
    }
  };

  // Transcribe audio and get an AI answer
  const transcribeAndAnswer = async () => {
    if (!audioUri) {
      Alert.alert(
        isNepali ? 'रेकर्डिङ छैन' : 'No recording',
        isNepali
          ? 'पहिले आफ्नो प्रश्न रेकर्ड गर्नुहोस्।'
          : 'Please record your question first.'
      );
      return;
    }

    try {
      setLoading(true);
      setTranscript('');
      setAnswer('');

      // Upload audio using Expo FileSystem
      const transcriptionResponse = await FileSystem.uploadAsync(
        `${API_BASE_URL}/api/transcribe`,
        audioUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'audio',
          mimeType: 'audio/wav',
          parameters: {
            language,
          },
        }
      );

      const transcriptionData = JSON.parse(
        transcriptionResponse.body
      );

      if (
        transcriptionResponse.status < 200 ||
        transcriptionResponse.status >= 300
      ) {
        throw new Error(
          transcriptionData.error || 'Voice transcription failed.'
        );
      }

      const recognisedText = transcriptionData.transcript || '';

      if (!recognisedText.trim()) {
        Alert.alert(
          isNepali ? 'आवाज पहिचान भएन' : 'No speech recognised',
          isNepali
            ? 'कृपया आफ्नो प्रश्न फेरि रेकर्ड गर्नुहोस्।'
            : 'Please try recording your question again.'
        );
        return;
      }

      setTranscript(recognisedText);

      setLoading(false);
      setAnswering(true);

      // Send recognised question to Muse Spark
      const answerResponse = await fetch(
        `${API_BASE_URL}/api/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: recognisedText,
            language,
          }),
        }
      );

      const answerData = await answerResponse.json();

      if (!answerResponse.ok) {
        throw new Error(
          answerData.error || 'Muse Spark could not answer.'
        );
      }

      const aiAnswer = answerData.answer || '';

      if (!aiAnswer.trim()) {
        throw new Error(
          'Muse Spark returned an empty answer.'
        );
      }

      setAnswer(aiAnswer);

      // Speak the answer
      Speech.speak(aiAnswer, {
        language: speechLanguage,
        rate: 0.9,
      });

    } catch (error: any) {
      Alert.alert(
        isNepali ? 'SeeAssist त्रुटि' : 'SeeAssist error',
        error.message || (
          isNepali
            ? 'केही समस्या भयो। फेरि प्रयास गर्नुहोस्।'
            : 'Something went wrong. Please try again.'
        )
      );
    } finally {
      setLoading(false);
      setAnswering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Back to Home */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            ‹ {isNepali ? 'गृहपृष्ठमा फर्कनुहोस्' : 'Back to Home'}
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {isNepali ? 'प्रश्न सोध्नुहोस्' : 'Ask a Question'}
        </Text>

        <Text style={styles.subtitle}>
          {isNepali
            ? 'आफ्नो वरपरको वातावरणबारे आवाजमार्फत प्रश्न सोध्नुहोस्। SeeAssist ले तपाईंको आवाज पहिचान गरी AI मार्फत उत्तर दिनेछ।'
            : 'Speak your question about your surroundings. SeeAssist will recognise your speech and answer using AI.'}
        </Text>

        {/* Recording section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isNepali ? 'आवाजमार्फत प्रश्न' : 'Voice Question'}
          </Text>

          <Pressable
            style={[
              styles.button,
              recording && styles.stopButton,
              (loading || answering) && styles.disabledButton,
            ]}
            onPress={recording ? stopRecording : startRecording}
            disabled={loading || answering}
          >
            <Text style={styles.buttonText}>
              {recording
                ? isNepali
                  ? 'रेकर्डिङ रोक्नुहोस्'
                  : 'Stop Recording'
                : isNepali
                  ? 'रेकर्डिङ सुरु गर्नुहोस्'
                  : 'Start Recording'}
            </Text>
          </Pressable>

          {recording && (
            <Text style={styles.status}>
              {isNepali
                ? 'सुन्दैछ... स्पष्ट रूपमा बोल्नुहोस्।'
                : 'Listening... Speak clearly.'}
            </Text>
          )}

          {audioUri && !recording && (
            <Text style={styles.status}>
              {isNepali
                ? 'रेकर्डिङ तयार छ।'
                : 'Recording ready.'}
            </Text>
          )}

          {audioUri && !recording && (
            <Pressable
              style={styles.transcribeButton}
              onPress={transcribeAndAnswer}
              disabled={loading || answering}
            >
              <Text style={styles.buttonText}>
                {isNepali
                  ? 'प्रश्न पहिचान गरी उत्तर दिनुहोस्'
                  : 'Transcribe and Answer'}
              </Text>
            </Pressable>
          )}

          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator
                size="large"
                color="#1769AA"
              />
              <Text style={styles.status}>
                {isNepali
                  ? 'तपाईंको प्रश्न पहिचान हुँदैछ...'
                  : 'Recognising your question...'}
              </Text>
            </View>
          )}

          {answering && (
            <View style={styles.loading}>
              <ActivityIndicator
                size="large"
                color="#1769AA"
              />
              <Text style={styles.status}>
                {isNepali
                  ? 'Muse Spark ले उत्तर तयार गर्दैछ...'
                  : 'Muse Spark is preparing your answer...'}
              </Text>
            </View>
          )}
        </View>

        {/* Recognised question */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isNepali
              ? 'पहिचान गरिएको प्रश्न'
              : 'Recognised Question'}
          </Text>

          <Text
            style={
              transcript
                ? styles.transcript
                : styles.placeholder
            }
          >
            {transcript ||
              (isNepali
                ? 'तपाईंको पहिचान गरिएको प्रश्न यहाँ देखिनेछ।'
                : 'Your recognised question will appear here.')}
          </Text>
        </View>

        {/* AI answer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isNepali
              ? 'SeeAssist को उत्तर'
              : 'SeeAssist Answer'}
          </Text>

          <Text
            style={
              answer
                ? styles.transcript
                : styles.placeholder
            }
          >
            {answer ||
              (isNepali
                ? 'तपाईंको AI उत्तर यहाँ देखिनेछ।'
                : 'Your AI answer will appear here.')}
          </Text>

          {answer !== '' && (
            <Pressable
              style={styles.transcribeButton}
              onPress={() =>
                Speech.speak(answer, {
                  language: speechLanguage,
                  rate: 0.9,
                })
              }
            >
              <Text style={styles.buttonText}>
                {isNepali
                  ? 'उत्तर ठूलो आवाजमा पढ्नुहोस्'
                  : 'Read Answer Aloud'}
              </Text>
            </Pressable>
          )}

          {answer !== '' && (
            <Pressable
              style={styles.stopSpeechButton}
              onPress={() => Speech.stop()}
            >
              <Text style={styles.buttonText}>
                {isNepali
                  ? 'पढ्न रोक्नुहोस्'
                  : 'Stop Reading'}
              </Text>
            </Pressable>
          )}
        </View>

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
    padding: 24,
    paddingTop: 35,
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
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#526477',
    marginBottom: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCE6F2',
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#12345A',
    marginBottom: 18,
  },

  button: {
    backgroundColor: '#1769AA',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },

  stopButton: {
    backgroundColor: '#B83B42',
  },

  transcribeButton: {
    backgroundColor: '#1769AA',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },

  stopSpeechButton: {
    backgroundColor: '#526477',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  status: {
    marginTop: 16,
    color: '#526477',
    fontSize: 15,
    textAlign: 'center',
  },

  loading: {
    marginTop: 20,
    alignItems: 'center',
  },

  transcript: {
    fontSize: 17,
    lineHeight: 26,
    color: '#304A65',
  },

  placeholder: {
    fontSize: 16,
    lineHeight: 24,
    color: '#8795A5',
  },
});
