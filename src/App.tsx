
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Sparkles, Star, Palette, TrendingUp, ThumbsUp, Scale, Scissors, Brain, Wand, Crown } from 'lucide-react';
import FashionBackground from './components/FashionBackground';
import { Sparkles, Palette, Scale, ThumbsUp, Check, Info } from 'lucide-react';

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
    hairstyle: string;
    reasons: string;
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

// 添加 fetchWithTimeout 工具函数
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), timeout)
        )
    ]);
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
    const [clothingProgress, setClothingProgress] = useState<ProgressState>({
        stage: 'UPLOAD',
        percent: 0,
        message: PROGRESS_STAGES.UPLOAD.zh
    });
    const [hairstyleProgress, setHairstyleProgress] = useState<ProgressState>({
        stage: 'IDLE',
        percent: 0,
        message: '空闲'
    });

    const updateClothingProgress = useCallback((stage: ProgressStage) => {
        setClothingProgress({
            stage,
            percent: PROGRESS_STAGES[stage].percent,
            message: PROGRESS_STAGES[stage][language]
        });
    }, [language]);

    const updateHairstyleProgress = useCallback((stage: ProgressStage) => {
        setHairstyleProgress({
            stage,
            percent: PROGRESS_STAGES[stage].percent,
            message: PROGRESS_STAGES[stage][language]
        });
    }, [language]);

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
        updateClothingProgress('UPLOAD');

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

            const response = await fetchWithTimeout(
                fullUrl,
                {
                    method: 'POST',
                    body: formDataToSend,
                    signal: abortControllerRef.current.signal,
                    credentials: 'include',
                    mode: 'cors'
                },
                30000 // 30 秒超时
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received response:', data);

            const clothingStages: ProgressStage[] = [
                'UPLOAD',
                'ANALYSIS',
                'GENERATE_TOP',
                'GENERATE_BOTTOM',
                'TRYON_CUSTOM',
                'TRYON_GENERATED',
                'COMMENTARY',
                'COMPLETE'
            ];

            for (const stage of clothingStages) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Request cancelled');
                }
                updateClothingProgress(stage);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            setResult(data);

            // 开始换发任务
            updateHairstyleProgress('START');

            const getHairstyleRecommendation = async (image: string) => {
                try {
                    updateHairstyleProgress('REQUESTING');
                    const response = await fetchWithTimeout(
                        'https://api.coze.cn/v1/workflow/run',
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer pat_XCdzRC2c6K7oMcc2xVJv37KYJR311nrU8uUCPbdnAPlWKaDY9TikL2W8nnkW9cbY',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                workflow_id: '7472218638747467817',
                                parameters: {
                                    input_image: image,
                                    type: 'hairstyle'  // 指示工作流生成发型推荐和换发效果
                                }
                            })
                        },
                        30000 // 30 秒超时
                    );
            
                    const responseData = await response.json();
                    if (responseData.code === 0 && responseData.data) {
                        updateHairstyleProgress('PROCESSING');
                        // 直接使用工作流返回的结果，包含发型名称、推荐理由和换发后的图片
                        const hairstyles = responseData.data.hairstyles || [];
                        return hairstyles.map(style => ({
                            hairstyle: style.name,
                            reasons: style.reason,
                            img: style.image_url
                        }));
                    }
                    return [];
                } catch (error) {
                    console.error('获取发型推荐失败:', error);
                    return [];
                } finally {
                    updateHairstyleProgress('COMPLETE');
                }
            };
            
            // 获取两种搭配的发型推荐
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

    const renderClothingProgressBar = useCallback(() => {
        if (!loading) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{clothingProgress.message}</h3>
                        <span className="text-sm font-medium text-orange-600">{clothingProgress.percent}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all duration-500 ease-out"
                            style={{ width: `${clothingProgress.percent}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }, [loading, clothingProgress]);

    const renderHairstyleProgressBar = useCallback(() => {
        if (hairstyleProgress.stage === 'IDLE') return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{hairstyleProgress.message}</h3>
                        <span className="text-sm font-medium text-orange-600">{hairstyleProgress.percent}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all duration-500
                            style={{ width: `${hairstyleProgress.percent}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }, [loading, hairstyleProgress]);

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

    // 添加 renderOutfitResult 函数
    const renderOutfitResult = useCallback((
        outfit: OutfitResult,
        title: { en: string; zh: string }
    ) => (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl animate-fade-in">
            <div className="relative">
                <h3 className="text-lg font-semibold p-4 bg-gradient-to-r from-orange-500 to-teal-500 text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Palette className="w-5 h-5 animate-pulse" />
                        {title[language]}
                    </span>
                    <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 animate-spin-slow" />
                        <span className="font-bold">{outfit.score}</span>
                    </div>
                </h3>
            </div>
            <div className="p-4 space-y-6">
                {/* 图片展示区域 */}
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden group">
                    <img
                        src={outfit.tryOnUrl}
                        alt={language === 'en' ? 'Try-on result' : '试穿效果'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center gap-2 text-white">
                                <Crown className="w-5 h-5 text-yellow-400 animate-pulse" />
                                <span className="font-medium">
                                    {language === 'en' ? 'Style Score' : '时尚评分'}
                                </span>
                                <div className="ml-auto flex items-center gap-1">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-5 h-5 ${
                                                    star <= outfit.score / 2
                                                        ? 'text-yellow-400 fill-yellow-400 animate-pulse'
                                                        : 'text-gray-400/50 fill-gray-400/50'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-2xl font-bold text-yellow-400 animate-bounce">
                                        {outfit.score}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* 评论区域 */}
                <div className="grid gap-4">
                    {outfit.commentary.split('\n').filter(line => line.trim()).map((comment, index) => {
                        if (comment.includes('综合评分')) return null;
                        const icons = [Sparkles, Palette, Scale, ThumbsUp, Check, Info];
                        const Icon = icons[index % icons.length];
                        const animations = [
                            'hover:-translate-y-1',
                            'hover:scale-105',
                            'hover:rotate-1',
                            'hover:-rotate-1',
                            'hover:skew-x-3',
                            'hover:skew-y-3'
                        ];
                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-lg bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm shadow-lg border border-white/50 transition-all duration-300 ${animations[index % animations.length]}`}
                            >
                                <div className="flex gap-3 items-start">
                                    <div className="flex-shrink-0 p-2 bg-gradient-to-br from-orange-500/10 to-teal-500/10 rounded-lg">
                                        <Icon className="w-5 h-5 text-orange-500 animate-pulse" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-700 leading-relaxed">
                                            {comment}
                                        </p>
                                        {index === 0 && (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-orange-500">
                                                <Crown className="w-3 h-3" />
                                                <span>
                                                    {language === 'en' ? 'AI Professional Review' : 'AI 专业点评'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
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

    // 添加语言切换按钮
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

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-gray-50 to-teal-50 relative">
            {renderLanguageSwitch()}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-5 animate-slide"></div>
                <div className="absolute -inset-[100%] bg-gradient-conic from-orange-500/30 via-teal-500/30 to-orange-500/30 animate-spin-slow blur-3xl"></div>
            </div>
            
            {renderProgressBar()}
            <div className="max-w-5xl mx-auto relative z-10">
                <div className="relative backdrop-blur-sm bg-white/80 rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-teal-500/10 animate-pulse"></div>
                    <div className="relative px-6 py-8 sm:p-10">
                        <div className="flex items-center justify-center mb-8">
                            <div className="w-32 h-32 relative animate-float">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-teal-500/20 rounded-full animate-pulse"></div>
                                <img
                                    src="/mirrormuse-logo.jpg"
                                    alt="MirrorMuse - AI Fashion Stylist"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                        <div className="text-center space-y-6">
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-purple-500 to-teal-600 bg-clip-text text-transparent animate-gradient-x">
                                {t.title[language]}
                            </h1>
                            <p className="mt-2 text-xl text-gray-600">{t.subtitle[language]}</p>
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-purple-500 to-teal-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-gradient-xy"></div>
                                <p className="relative px-7 py-4 bg-black bg-opacity-80 rounded-lg leading-none">
                                    <span className="text-lg bg-gradient-to-r from-orange-400 via-pink-500 to-teal-400 bg-clip-text text-transparent font-medium animate-pulse">
                                        {language === 'en' 
                                            ? 'Where Style Meets Innovation'
                                            : '魅影随行，演绎时尚'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* 添加动态背景效果 */}
                        <div className="absolute inset-0 -z-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-100/40 via-purple-100/40 to-teal-100/40 animate-gradient-xy"></div>
                            <div className="absolute inset-0 opacity-30">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,140,50,0.1),rgba(100,220,200,0.1))] animate-pulse"></div>
                                <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat opacity-10 animate-slide"></div>
                            </div>
                        </div>

                        {/* 添加功能卡片部分 */}
                        <div className="mt-12 mb-8">
                            <h2 className="text-2xl font-semibold text-center mb-8 bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                                {t.features.title[language]}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {FEATURES.map((feature, index) => {
                                    const Icon = lucideIcons[feature.icon];
                                    return (
                                        <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
                                            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-teal-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Icon className="w-6 h-6 text-orange-600" />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                                                {feature.title[language]}
                                            </h3>
                                            <p className="text-gray-600 text-sm">
                                                {feature.desc[language]}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
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
                            <div className="mt-12 space-y-12">
                                {/* 虚拟换衣结果 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* 自选搭配结果 */}
                                    {renderOutfitResult(result.custom, t.results.custom)}
                                    {/* AI推荐搭配结果 */}
                                    {renderOutfitResult(result.generated, t.results.generated)}
                                </div>
                                {/* 发型推荐部分保持不变 */}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* 自选搭配发型 */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                                        <h3 className="text-xl font-semibold p-4 bg-gradient-to-r from-orange-600 to-teal-600 text-white">
                                            {language === 'en' ? 'Recommended Hairstyles' : '推荐发型'}
                                        </h3>
                                        <div className="p-4">
                                            {renderCustomHairstyles()}
                                        </div>
                                    </div>
                                    {/* AI推荐搭配发型 */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                                        <h3 className="text-xl font-semibold p-4 bg-gradient-to-r from-orange-600 to-teal-600 text-white">
                                            {language === 'en' ? 'AI Recommended Hairstyles' : 'AI推荐发型'}
                                        </h3>
                                        <div className="p-4">
                                            {renderGeneratedHairstyles()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
