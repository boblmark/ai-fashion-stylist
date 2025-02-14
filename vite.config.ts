import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Sparkles, Star, Palette, TrendingUp, ThumbsUp, Scale } from 'lucide-react';

// ... (previous interface definitions remain the same)

function App() {
  const [personPhoto, setPersonPhoto] = useState<UploadPreview | null>(null);
  const [topGarment, setTopGarment] = useState<UploadPreview | null>(null);
  const [bottomGarment, setBottomGarment] = useState<UploadPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const [error, setError] = useState<ErrorState>({ message: '', visible: false });
  const [progress, setProgress] = useState<ProgressState>({ 
    stage: 'UPLOAD', 
    percent: 0, 
    message: PROGRESS_STAGES.UPLOAD.zh 
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState<FormData>({
    height: '',
    weight: '',
    bust: '',
    waist: '',
    hips: '',
    style_preference: STYLE_PREFERENCES[0].zh
  });

  // ... (previous translation object and other helper functions remain the same)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!personPhoto?.file || !topGarment?.file || !bottomGarment?.file) {
      showError(t.error.upload[language]);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    updateProgress('UPLOAD');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('person_photo', personPhoto.file);
      formDataToSend.append('custom_top_garment', topGarment.file);
      formDataToSend.append('custom_bottom_garment', bottomGarment.file);
      
      Object.entries(formData).forEach(([key, value]) => {
        if (!value) {
          throw new Error('All measurements are required');
        }
        formDataToSend.append(key, value);
      });

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const baseUrl = apiUrl || window.location.origin;
      const fullUrl = `${baseUrl}/api/generate-clothing`;

      console.log('Sending request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formDataToSend,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received response:', data);

      const stages: ProgressStage[] = [
        'UPLOAD',
        'ANALYSIS',
        'GENERATE_TOP',
        'GENERATE_BOTTOM',
        'TRYON_CUSTOM',
        'TRYON_GENERATED',
        'COMMENTARY',
        'COMPLETE'
      ];

      for (const stage of stages) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Request cancelled');
        }
        updateProgress(stage);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setResult(data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Request cancelled');
          return;
        }
        console.error('Error:', error);
        showError(error.message);
      } else {
        console.error('Unknown error:', error);
        showError(t.error.general[language]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // ... (rest of the component remains the sa
