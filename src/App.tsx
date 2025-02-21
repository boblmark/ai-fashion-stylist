import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Sparkles, Star, Palette, TrendingUp, ThumbsUp, Scale, Scissors, Brain, Wand, Crown } from 'lucide-react';
import FashionBackground from './components/FashionBackground';

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
    commentary: {
        en: string;
        zh: string;
    };
    score: number;
}

interface Result {
    recommendations: string;
    custom: OutfitResult;
    generated: OutfitResult;
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
    COMMENTARY: { percent: 85, en: 'Getting style commentary', zh: '获取穿搭点评中...' },
    HAIRSTYLE: { percent: 95, en: 'Generating hairstyle recommendations', zh: '生成发型推荐中...' },
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

// 在现有的 interface 定义中添加
interface HairStyle {
    hairstyle: {
        en: string;
        zh: string;
    };
    reasons: {
        en: string;
        zh: string;
    };
    img: string;
}

interface HairStyles {
    custom: HairStyle[];
    generated: HairStyle[];
}

// 定义 feature 类型
interface Feature {
    icon: 'Brain' | 'Wand' | 'Scissors' | 'Crown';
    title: { en: string; zh: string };
    desc: { en: string; zh: string };
}

const t = {
    title: {
        en: 'MirrorMuse',
        zh: '魅影衣橱'  // 保持原有名称
    },
    subtitle: {
        en: 'AI Fashion Stylist',
        zh: 'AI时尚造型专家'
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
    },
     features: {
        title: { en: 'Why Choose MirrorMuse?', zh: '为什么选择魅影衣橱？' },
        items: [
            {
                icon: 'Brain',
                title: { en: 'AI-Powered Style Analysis', zh: 'AI智能风格分析' },
                desc: { 
                    en: 'Advanced algorithms analyze your body features and personal style',
                    zh: '先进算法分析身材特征与个人风格'
                }
            },
            {
                icon: 'Wand',
                title: { en: 'Virtual Try-On Magic', zh: '虚拟试穿体验' },
                desc: {
                    en: 'See how outfits look on you instantly',
                    zh: '即刻预览完美搭配效果'
                }
            },
            {
                icon: 'Scissors',
                title: { en: 'Complete Style Solution', zh: '全方位造型方案' },
                desc: {
                    en: 'Get personalized outfit and hairstyle recommendations',
                    zh: '获取个性化服装搭配与发型推荐'
                }
            },
            {
                icon: 'Crown',
                title: { en: 'Expert Commentary', zh: '专业点评建议' },
                desc: {
                    en: 'Receive detailed style analysis and fashion advice',
                    zh: '获得详细的风格分析和时尚建议'
                }
            }
        ]
    }
};

const FEATURES: Feature[] = t.features.items;

const lucideIcons = {
  Upload,
  Camera,
  Sparkles,
  Star,
  Palette,
  TrendingUp,
  ThumbsUp,
  Scale,
  Scissors,
  Brain,
  Wand,
  Crown
};

function App() {
    const [personPhoto, setPersonPhoto] = useState<UploadPreview | null>(null);
    const [topGarment, setTopGarment] = useState<UploadPreview | null>(null);
    const [bottomGarment, setBottomGarment] = useState<UploadPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Result | null>(null);
    const [language, setLanguage] = useState<'en' | 'zh'>('zh');
    const [error, setError] = useState<ErrorState>({ message: '', visible: false });
    const [hairstyles, setHairstyles] = useState<HairStyles>({ custom: [], generated: [] });
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

    const renderError = useCallback(() => {
        if (!error.visible) return null;
        return (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{error.message}</span>
                </div>
            </div>
        );
    }, [error]);

    const renderLanguageSwitch = useCallback(() => (
        <button
            onClick={() => setLanguage(prev => prev === 'zh' ? 'en' : 'zh')}
            className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
            <span className="text-sm font-medium bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                {language === 'zh' ? 'English' : '中文'}
            </span>
        </button>
    ), [language]);

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

    const getHairstyleRecommendation = async (imageUrl: string): Promise<HairStyle[]> => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const baseUrl = apiUrl || window.location.origin;
            const response = await fetch(`${baseUrl}/api/recommend-hairstyle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image_url: imageUrl }),
            });

            if (!response.ok) {
                throw new Error('Failed to get hairstyle recommendations');
            }

            return await response.json();
        } catch (error) {
            console.error('Hairstyle recommendation error:', error);
            return [];
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
        
        if (!personPhoto || !topGarment || !bottomGarment) {
            showError(t.error.upload[language]);
            return;
        }
        
        try {
            setLoading(true);
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
                mode: 'cors',
                // 删除 Access-Control-Allow-Origin 头部，这个应该由后端设置
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
                'HAIRSTYLE',
                'COMPLETE'
            ];

            for (const stage of stages) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Request cancelled');
                }
                updateProgress(stage);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 确保数据完整性
            if (!data.custom || !data.generated) {
                throw new Error(language === 'en' ? 'Invalid response data' : '响应数据无效');
            }
            
            // 设置结果
            setResult(data);
            
            // 获取发型推荐
            const [customHairstyles, generatedHairstyles] = await Promise.all([
                getHairstyleRecommendation(data.custom.tryOnUrl),
                getHairstyleRecommendation(data.generated.tryOnUrl)
            ]);
            
            setHairstyles({
                custom: customHairstyles,
                generated: generatedHairstyles
            });
            
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

    const renderCustomHairstyles = useCallback(() => {
        if (!hairstyles.custom || hairstyles.custom.length === 0) {
            return <p>{language === 'en' ? 'No hairstyle recommendations found.' : '暂无发型推荐。'}</p>;
        }
    
        return (
            <div className="grid grid-cols-2 gap-4">
                {hairstyles.custom.map((style, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-teal-500/10 mix-blend-overlay"></div>
                            <div className="aspect-[3/4] rounded-lg overflow-hidden">
                                <img
                                    src={style.img}
                                    alt={style.hairstyle[language]}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error('发型图片加载失败:', style.img);
                                        e.currentTarget.src = '/fallback-image.jpg';
                                    }}
                                />
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Scissors className="w-4 h-4 text-orange-500" />
                                    <span className="font-medium text-gray-900">{style.hairstyle[language]}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">{style.reasons[language]}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [hairstyles.custom, language]);

    // 删除第一个 renderOutfitResult 函数定义
    
    const renderGeneratedHairstyles = useCallback(() => {
        console.log('Generated hairstyles:', hairstyles.generated);
        
        if (hairstyles.generated.length === 0) {
            return <p>{language === 'en' ? 'No hairstyle recommendations found for AI-generated outfit.' : '没有找到适合 AI 搭配的发型推荐。'}</p>;
        }

        return (
            <div className="grid grid-cols-2 gap-4">
                {hairstyles.generated.map((style, index) => (
                    <div key={index} className="space-y-3">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-r from-orange-500 to-teal-500">
                            <img
                                src={style.img}
                                alt={style.hairstyle[language]} // 修改这里
                                className="w-full h-full object-cover"
                                onError={(e) => {  // 添加错误处理
                                    console.error('发型图片加载失败:', style.img);
                                    e.currentTarget.src = '/fallback-image.jpg';
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">{style.hairstyle[language]}</h4>
                            <p className="text-sm text-gray-600">{style.reasons[language]}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [hairstyles.generated, language]);

    const renderUploadBox = useCallback((
        preview: UploadPreview | null,
        setPreview: (preview: UploadPreview | null) => void,
        label: { en: string; zh: string },
        placeholder: { en: string; zh: string },
        icon: React.ReactNode
    ) => (
        <div className="group">
            <label className="block text-sm font-medium bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent mb-2">
                {label[language]}
            </label>
            <div className="relative h-48 rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-teal-500/20 group-hover:opacity-0 transition-opacity"></div>
                {preview ? (
                    <img
                        src={preview.preview}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-r from-gray-50 to-gray-100 group-hover:from-orange-50 group-hover:to-teal-50 transition-all duration-300">
                        {icon}
                        <span className="mt-2 text-sm text-gray-500 group-hover:text-gray-700">{placeholder[language]}</span>
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

    const renderVirtualTryOn = useCallback((outfit: OutfitResult) => {
        return (
            <div className="relative group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-r from-orange-500 to-teal-500">
                    <img
                        src={outfit.tryOnUrl}
                        alt="Virtual Try-On"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                            console.error('虚拟换衣图片加载失败:', outfit.tryOnUrl);
                            e.currentTarget.src = '/fallback-image.jpg';
                        }}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex gap-2">
                            <img
                                src={outfit.topUrl}
                                alt="Top"
                                className="w-16 h-16 rounded-lg object-cover border-2 border-white/50"
                            />
                            <img
                                src={outfit.bottomUrl}
                                alt="Bottom"
                                className="w-16 h-16 rounded-lg object-cover border-2 border-white/50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }, []);

    // 在 renderOutfitResult 函数中更新图片渲染部分
    const renderOutfitResult = useCallback((
        outfit: OutfitResult,
        title: { en: string; zh: string },
        hairstyles: HairStyle[]
    ) => {
        // 添加空值检查
        const commentary = outfit.commentary?.[language] || '';
        const commentaryLines = commentary.split('\n').filter(line => line.trim());
        const scorePattern = /(\d+(?:\.\d+)?)\s*分/;
        const score = outfit.score || 8; // 默认分数为8
        
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
                            <span className="font-bold">{score}</span>
                        </div>
                    </h3>
                </div>
    
                <div className="p-4 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        {renderVirtualTryOn(outfit)}
                        {/* 删除重复的试衣图片渲染部分 */}
                        {commentaryLines.map((line, index) => {
                            if (scorePattern.test(line)) return null;
    
                            const icons = [ThumbsUp, Star, Scale, Palette];
                            const Icon = icons[index % icons.length];
    
                            return (
                                <div
                                    key={index}
                                    className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-teal-500 border border-gray-100"
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
                                                star <= score / 2
                                                    ? 'fill-white'
                                                    : 'fill-white/30'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="font-bold text-xl">{score}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [language, t.results, renderVirtualTryOn]);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-gray-50 to-teal-50 relative">
            {renderError()}
            {renderLanguageSwitch()}
            {renderProgressBar()}
            <div className="max-w-5xl mx-auto relative z-10 p-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                        {t.title[language]}
                    </h1>
                    <p className="mt-2 text-gray-600">{t.subtitle[language]}</p>
                </div>

                {/* 添加特色功能卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {FEATURES.map((feature, index) => {
                        const Icon = lucideIcons[feature.icon];
                        return (
                            <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-100 to-teal-100 flex items-center justify-center mb-4">
                                    <Icon className="w-6 h-6 text-orange-500" />
                                </div>
                                <h3 className="text-lg font-medium mb-2 bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                                    {feature.title[language]}
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {feature.desc[language]}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 现有的上传框 */}
                    </div>
                    
                    {/* 添加身材数据和风格偏好卡片 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl p-6 shadow-lg">
                            <h3 className="text-lg font-medium mb-4 bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                                {language === 'en' ? 'Body Measurements' : '身材数据'}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(t.measurements).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            {value[language]}
                                        </label>
                                        <input
                                            type="number"
                                            name={key}
                                            value={formData[key as keyof FormData]}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-lg">
                            <h3 className="text-lg font-medium mb-4 bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                                {t.style[language]}
                            </h3>
                            <select
                                name="style_preference"
                                value={formData.style_preference}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                {STYLE_PREFERENCES.map((style, index) => (
                                    <option key={index} value={style.zh}>
                                        {style[language]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-6 text-white bg-gradient-to-r from-orange-500 to-teal-500 rounded-lg hover:from-orange-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {loading ? t.button.generating[language] : t.button.generate[language]}
                    </button>
                </form>
                {result && (
                    <div className="mt-12 space-y-12">
                        {renderOutfitResult(result.custom, t.results.custom, hairstyles.custom)}
                        {renderOutfitResult(result.generated, t.results.generated, hairstyles.generated)}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
