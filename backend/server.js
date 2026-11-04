
require('dotenv').config({
  path: require('path').join(__dirname, '.env'),
});

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createWorker } = require('tesseract.js');

const app = express();
const PORT = 3001;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

let ocrWorkerPromise;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker('eng');
  }
  return ocrWorkerPromise;
}

// Select the response language.
function getLanguageInstruction(language) {
  if (language === 'ne') {
    return 'Respond entirely in natural, clear Nepali (नेपाली). Use simple everyday language that is easy to understand when read aloud.';
  }

  return 'Respond entirely in clear, natural English. Use simple everyday language that is easy to understand when read aloud.';
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Check that the backend is running
app.get('/', (req, res) => {
  res.json({
    message: 'SeeAssist backend is running!',
  });
});

// 1. Analyse a photograph using Meta Muse Spark
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType, language } = req.body;

    if (!process.env.MODEL_API_KEY) {
      return res.status(500).json({
        error: 'Meta API key is not configured.',
      });
    }

    if (!imageBase64) {
      return res.status(400).json({
        error: 'No photograph was provided.',
      });
    }

    const imageData = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    const languageInstruction = getLanguageInstruction(language);

    const response = await fetch(
      'https://api.meta.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'muse-spark-1.3',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'You are SeeAssist, an accessibility assistant for a person who is visually impaired. ' +
                    'Describe this photograph clearly. Explain the main objects, people, surroundings, their positions and any important visible hazards. ' +
                    'Be concise, practical and avoid guessing details you cannot see. ' +
                    languageInstruction,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta API error:', response.status, data);

      return res.status(response.status).json({
        error: data.error?.message || 'Muse Spark analysis failed.',
      });
    }

    const description = data.choices?.[0]?.message?.content;

    if (!description) {
      return res.status(502).json({
        error: 'Muse Spark returned no description.',
      });
    }

    res.json({ description });
  } catch (error) {
    console.error('Analysis error:', error.message);

    res.status(500).json({
      error: 'Unable to analyse the photograph. Please try again.',
    });
  }
});

// 2. Extract printed text using Tesseract OCR
// Current OCR language: English
app.post('/api/read-text', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'No photograph was provided.',
      });
    }

    const cleanBase64 = imageBase64.replace(
      /^data:image\/\w+;base64,/,
      ''
    );

    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const worker = await getOcrWorker();
    const result = await worker.recognize(imageBuffer);

    const extractedText = result.data.text.trim();

    res.json({ text: extractedText });
  } catch (error) {
    console.error('OCR error:', error.message);

    res.status(500).json({
      error: 'Unable to extract text from this photograph.',
    });
  }
});

// 3. Answer a voice question using Meta Muse Spark
app.post('/api/answer', async (req, res) => {
  try {
    const { question, language } = req.body;

    if (!process.env.MODEL_API_KEY) {
      return res.status(500).json({
        error: 'Meta API key is not configured.',
      });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: 'No question was provided.',
      });
    }

    const languageInstruction = getLanguageInstruction(language);

    const response = await fetch(
      'https://api.meta.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'muse-spark-1.3',
          messages: [
            {
              role: 'system',
              content:
                'You are SeeAssist, an accessibility assistant for visually impaired people. ' +
                'Give clear, concise and practical answers. ' +
                'Never pretend to see the surroundings unless an image has been provided. ' +
                languageInstruction,
            },
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Muse answer error:', response.status, data);

      return res.status(response.status).json({
        error: data.error?.message || 'Muse Spark could not answer.',
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: 'Muse Spark returned no answer.',
      });
    }

    res.json({ answer });
  } catch (error) {
    console.error('Answer error:', error.message);

    res.status(500).json({
      error: 'Unable to answer the question. Please try again.',
    });
  }
});

// 4. Transcribe a WAV recording using Meta Muse Voice
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.MODEL_API_KEY) {
      return res.status(500).json({
        error: 'Meta API key is not configured.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No audio recording was provided.',
      });
    }

    const formData = new FormData();

    const requestSettings = {
      model: 'muse-voice-transcribe-1.0',
      audioEncoding: 'WAV',
      mode: 'PUSH_TO_TALK',
    };

    formData.append(
      'request',
      new Blob(
        [JSON.stringify(requestSettings)],
        { type: 'application/json' }
      )
    );

    formData.append(
      'audio',
      new Blob(
        [req.file.buffer],
        { type: 'audio/wav' }
      ),
      'recording.wav'
    );

    const response = await fetch(
      'https://api.meta.ai/v1/asr/transcribe',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
          Accept: 'application/json',
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        'Meta transcription error:',
        response.status,
        data
      );

      return res.status(response.status).json({
        error: data.error?.message || 'Voice transcription failed.',
      });
    }

    const transcript = data.transcript || data.text || '';

    res.json({ transcript });
  } catch (error) {
    console.error('Transcription error:', error.message);

    res.status(500).json({
      error: 'Unable to transcribe the recording.',
    });
  }
});

// Start the backend
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SeeAssist backend running on port ${PORT}`);
});
