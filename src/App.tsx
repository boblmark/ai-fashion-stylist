import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios'; // 新增
import { Upload, Camera, Sparkles, Star, Palette, TrendingUp, ThumbsUp, Scale } from 'lucide-react';

interface FormData {
  height: string;
  weight: string;
  bust: string;
  waist: string;
  hips: string;
  style_preference: string;
}

interface UploadPreview {
  file: File;
  preview: string;
}

interface ErrorState {
  message: string;
  visible: boolean;
}

interface OutfitResult {
  topUrl: string;
  bottomUrl: string;
  tryOnUrl: string;
  commentary: string;
  score: number;
}

interface Result {
  recommendations: string;
  custom: OutfitResult;
  generated: OutfitResult;
  customHairstyleUrl?: string; // 新增字段
  generatedHairstyleUrl?: string; // 新增字段
}

interface ProgressState {
  stage: string;
  percent: number;
  message: string;
}

const PROGRESS_STAGES = {
  UPLOAD: { percent: 0, en: 'Uploading images', zh: '上传图片中...' },
  ANALYSIS: { percent: 20, en: 'Analyzing body features', zh: '分析身体特征中...' },
  GENERATE_TOP: { percent: 40, en: 'Generating top garment', zh: '生成上衣中...' },
  GENERATE_BOTTOM: { percent: 50, en: 'Generating bottom garment', zh: '生成下装中...' },
  TRYON_CUSTOM: { percent: 60, en: 'Processing custom outfit', zh: '处理自选服装中...' },
  TRYON_GENERATED: { percent: 80, en: 'Processing generated outfit', zh: '处理生成服装中...' },
  COMMENTARY: { percent: 90, en: 'Getting style commentary', zh: '获取穿搭点评中...' },
  COMPLETE: { percent: 100, en: 'Completed', zh: '完成' }
} as const;

type ProgressStage = keyof typeof PROGRESS_STAGES;

const STYLE_PREFERENCES = [
  { en: "Casual", zh: "休闲" },
  { en: "Fashion", zh: "时尚" },
  { en: "Vintage", zh: "复古" },
  { en: "Minimalist", zh: "简约" },
  { en: "Sweet", zh: "甜美" }
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  const t = {
    title: {
      en: 'AI Fashion Stylist',
      zh: 'AI时尚造型师'
    },
    subtitle: {
      en: 'Virtual Try-On & Style Analysis',
      zh: '虚拟试衣与穿搭分析'
    },
    upload: {
      person: { en: 'Your Photo', zh: '个人照片' },
      top: { en: 'Top Garment', zh: '上衣' },
      bottom: { en: 'Bottom Garment', zh: '下装' },
      photo: { en: 'Upload photo', zh: '上传照片' },
      top_text: { en: 'Upload top', zh: '上传上衣' },
      bottom_text: { en: 'Upload bottom', zh: '上传下装' }
    },
    measurements: {
      height: { en: 'Height (cm)', zh: '身高 (cm)' },
      weight: { en: 'Weight (kg)', zh: '体重 (kg)' },
      bust: { en: 'Bust (cm)', zh: '胸围 (cm)' },
      waist: { en: 'Waist (cm)', zh: '腰围 (cm)' },
      hips: { en: 'Hips (cm)', zh: '臀围 (cm)' }
    },
    style: { en: 'Style Preference', zh: '风格偏好' },
    button: {
      generate: { en: 'Create Your Style', zh: '创建专属造型' },
      generating: { en: 'Creating...', zh: '创建中...' }
    },
    results: {
      title: { en: 'Your Style Analysis', zh: '你的造型分析' },
      custom: { en: 'Your Selected Outfit', zh: '你的选择' },
      generated: { en: 'AI Recommended Outfit', zh: 'AI推荐' },
      analysis: { en: 'Style Analysis', zh: '造型分析' },
      commentary: { en: 'Expert Commentary', zh: '专业点评' },
      score: { en: 'Style Score', zh: '时尚指数' }
    },
    error: {
      upload: { en: 'Please upload all required images', zh: '请上传所有必要的图片' },
      general: { en: 'An error occurred', zh: '发生错误' },
      fileSize: { en: 'File size must be less than 5MB', zh: '文件大小必须小于5MB' },
      fileType: { en: 'Only JPG, PNG and WebP images are allowed', zh: '仅支持JPG、PNG和WebP格式的图片' }
    }
  };

  const updateProgress = useCallback((stage: ProgressStage) => {
    setProgress({
      stage,
      percent: PROGRESS_STAGES[stage].percent,
      message: PROGRESS_STAGES[stage][language]
    });
  }, [language]);

  const showError = useCallback((message: string) => {
    setError({ message, visible: true });
    setTimeout(() => setError({ message: '', visible: false }), 5000);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      showError(t.error.fileSize[language]);
      return false;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      showError(t.error.fileType[language]);
      return false;
    }
    return true;
  }, [language, showError]);

  const handleFileChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: (preview: UploadPreview | null) => void
  ) => {
    try {
      const file = event.target.files?.[0];
      if (file) {
        if (!validateFile(file)) {
          event.target.value = '';
          return;
        }

        setPreview(prev => {
          if (prev?.preview) {
            URL.revokeObjectURL(prev.preview);
          }
          return null;
        });

        const preview: UploadPreview = {
          file,
          preview: URL.createObjectURL(file)
        };
        setPreview(preview);
      }
    } catch (err) {
      console.error('File upload error:', err);
      showError(language === 'en' ? 'Failed to upload file' : '文件上传失败');
      event.target.value = '';
    }
  }, [language, validateFile, showError]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

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
        signal: abortControllerRef.current.signal,
        credentials: 'include',
        mode: 'cors'
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

  const renderUploadBox = useCallback((
    preview: UploadPreview | null,
    setPreview: (preview: UploadPreview | null) => void,
    label: { en: string; zh: string },
    placeholder: { en: string; zh: string },
    icon: React.ReactNode
  ) => (
    <div className="flex flex-col items-center">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label[language]}
      </label>
      <div className="relative flex items-center justify-center w-full h-40 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg appearance-none hover:border-orange-500 focus:outline-none group">
        {preview ? (
          <img
            src={preview.preview}
            alt="Preview"
            className="h-full object-contain rounded-lg transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center transition-transform group-hover:scale-110">
            {icon}
            <span className="mt-2 text-sm text-gray-500">{placeholder[language]}</span>
          </div>
        )}
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handleFileChange(e, setPreview)}
          accept={ALLOWED_FILE_TYPES.join(',')}
        />
      </div>
    </div>
  ), [language, handleFileChange]);

  const renderOutfitResult = useCallback((
    outfit: OutfitResult,
    title: { en: string; zh: string },
    hairstyleUrl?: string // 新增参数
  ) => {
    const commentaryLines = outfit.commentary.split('\n').filter(line => line.trim());
    const scoreMatch = outfit.commentary.match(/综合评分[：:]\s*(\d+(\.\d+)?)\s*分/);
    const commentaryWithoutScore = commentaryLines
      .filter(line => !line.includes('综合评分'))
      .join('\n');

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-teal-500/10 mix-blend-overlay"></div>
          <h3 className="text-lg font-semibold p-4 bg-gradient-to-r from-orange-500 to-teal-500 text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {title[language]}
            </span>
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
              <Star className="w-4 h-4" />
              <span className="font-bold">{outfit.score}</span>
            </div>
          </h3>
        </div>

        <div className="p-4 space-y-6">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden group">
            <img
              src={outfit.tryOnUrl}
              alt="Try-on result"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {hairstyleUrl && (
              <img
                src={hairstyleUrl}
                alt="Hairstyle result"
                className="hairstyle-image" // 使用之前定义的样式类
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              {t.results.commentary[language]}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {commentaryLines.map((line, index) => {
                if (line.includes('综合评分')) return null;
                
                const icons = [ThumbsUp, Star, Scale, Palette];
                const Icon = icons[index % icons.length];
                
                return (
                  <div 
                    key={index}
                    className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-teal-50 border border-gray-100"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <Icon className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {line}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-orange-500 to-teal-500 text-white">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.results.score[language]}</span>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= outfit.score / 2
                            ? 'fill-white'
                            : 'fill-white/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-xl">{outfit.score}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [language, t.results]);

  const renderProgressBar = useCallback(() => {
    if (!loading) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{progress.message}</h3>
            <span className="text-sm font-medium text-orange-600">{progress.percent}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }, [loading, progress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {renderProgressBar()}
      <div className="max-w-4xl mx-auto">
        {error.visible && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 animate-fade-in">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-teal-500 opacity-10"></div>
            <div className="relative px-6 py-8 sm:p-10">
              <div className="flex items-center justify-center mb-8">
                <div className="w-24 h-24 relative logo-float">
                  <img
                    src="/logo.svg"
                    alt="AI Fashion Stylist Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                  {t.title[language]}
                </h1>
                <p className="mt-2 text-lg text-gray-600">{t.subtitle[language]}</p>
              </div>
              
              <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                <div className="grid grid-cols-1 gap-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    {renderUploadBox(
                      personPhoto,
                      setPersonPhoto,
                      t.upload.person,
                      t.upload.photo,
                      <Camera className="w-12 h-12 text-orange-400" />
                    )}
                    {renderUploadBox(
                      topGarment,
                      setTopGarment,
                      t.upload.top,
                      t.upload.top_text,
                      <Upload className="w-12 h-12 text-orange-400" />
                    )}
                    {renderUploadBox(
                      bottomGarment,
                      setBottomGarment,
                      t.upload.bottom,
                      t.upload.bottom_text,
                      <Upload className="w-12 h-12 text-orange-400" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {Object.entries(t.measurements).slice(0, 3).map(([key, label]) => (
                        <div key={key} className="group">
                          <label className="block text-sm font-medium text-gray-700 group-hover:text-orange-600">
                            {label[language]}
                          </label>
                          <input
                            type="number"
                            name={key}
                            value={formData[key as keyof FormData]}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm transition-colors"
                            required
                            min="1"
                            step="0.1"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {Object.entries(t.measurements).slice(3).map(([key, label]) => (
                        <div key={key} className="group">
                          <label className="block text-sm font-medium text-gray-700 group-hover:text-orange-600">
                            {label[language]}
                          </label>
                          <input
                            type="number"
                            name={key}
                            value={formData[key as keyof FormData]}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm transition-colors"
                            required
                            min="1"
                            step="0.1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 group-hover:text-orange-600">
                      {t.style[language]}
                    </label>
                    <select
                      name="style_preference"
                      value={formData.style_preference}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm transition-colors"
                    >
                      {STYLE_PREFERENCES.map((style) => (
                        <option key={style.zh} value={style.zh}>
                          {language === 'en' ? style.en : style.zh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full flex items-center justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white transition-all duration-200 ${
                        loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-600 to-teal-600 hover:from-orange-500 hover:to-teal-500 transform hover:scale-[1.02]'
                      }`}
                    >
                      <Sparkles className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : 'animate-pulse'}`} />
                      {loading ? t.button.generating[language] : t.button.generate[language]}
                    </button>
                  </div>
                </div>
              </form>

              {result && (
                <div className="mt-12 space-y-8 animate-fade-in">
                  <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                    {t.results.title[language]}
                  </h2>
                  
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                      {t.results.analysis[language]}
                    </h3>
                    <div className="bg-gradient-to-r from-orange-50 to-teal-50 rounded-lg p-6">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {result.recommendations}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {renderOutfitResult(result.custom, t.results.custom, result.customHairstyleUrl)}
                    {renderOutfitResult(result.generated, t.results.generated, result.generatedHairstyleUrl)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
