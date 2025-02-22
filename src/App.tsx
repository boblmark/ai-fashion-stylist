
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, Sparkles, Star, Palette, TrendingUp, ThumbsUp, Scale, Scissors, Brain, Wand, Crown, Check, Info } from 'lucide-react';
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

// 添加类型定义
interface OutfitResult {
    tryOnUrl: string;
    score: number;
    commentary: {
        en: string;
        zh: string;
    };
}

interface HairstyleRecommendation {
    hairstyle: string;
    reasons: string;
    img: string;
}

// 确保 OutfitResult 接口只定义一次
interface OutfitResult {
    tryOnUrl: string;
    score: number;
    commentary: {
        en: string;
        zh: string;
    };
}

// 修改 renderOutfitResult 函数，添加 language 作为依赖项
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
                {outfit.commentary[language].split('\n').filter(line => line.trim()).map((comment, index) => {
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

// 移除重复的 renderOutfitResult 函数声明
// 保留最初的定义即可

// 修改 handleSubmit 函数，移除嵌套的 getHairstyleRecommendation 函数
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

        setResult(data);

        // 获取发型推荐
        // 修改并发处理逻辑
        const getHairstyleRecommendation = async (image: string) => {
            try {
                // 先获取发型推荐
                console.log('开始获取发型推荐，输入图片:', image);
                const response = await fetch('https://api.coze.cn/v1/workflow/run', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer pat_XCdzRC2c6K7oMcc2xVJv37KYJR311nrU8uUCPbdnAPlWKaDY9TikL2W8nnkW9cbY',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        workflow_id: '7472218638747467817',  // 使用同一个 workflow_id
                        parameters: {
                            input_image: image
                        }
                    })
                });
            
                const responseData = await response.json();
                console.log('发型推荐原始响应:', responseData);
                
                if (responseData.code === 0 && responseData.data) {
                    try {
                        // 尝试解析返回的数据
                        let parsedData;
                        if (typeof responseData.data === 'string') {
                            parsedData = JSON.parse(responseData.data);
                        } else {
                            parsedData = responseData.data;
                        }
                        
                        console.log('解析后的发型数据:', parsedData);
                        
                        // 获取推荐的发型列表
                        let hairstyles = [];
                        if (Array.isArray(parsedData)) {
                            hairstyles = parsedData;
                        } else if (parsedData.output && Array.isArray(parsedData.output)) {
                            hairstyles = parsedData.output;
                        } else if (parsedData.hairstyles && Array.isArray(parsedData.hairstyles)) {
                            hairstyles = parsedData.hairstyles;
                        } else if (typeof parsedData === 'string') {
                            // 尝试从字符串中提取发型信息
                            try {
                                const extractedData = JSON.parse(parsedData);
                                hairstyles = Array.isArray(extractedData) ? extractedData : 
                                (extractedData.output && Array.isArray(extractedData.output)) ? extractedData.output :
                                (extractedData.hairstyles && Array.isArray(extractedData.hairstyles)) ? extractedData.hairstyles : [];
                            } catch (e) {
                                console.error('解析字符串数据失败:', e);
                            }
                        }
                        
                        // 确保每个发型对象都有必要的字段
                        hairstyles = hairstyles.map(style => ({
                            hairstyle: typeof style === 'string' ? style : style.hairstyle || '推荐发型',
                            reasons: style.reasons || '根据您的风格特点推荐此发型',
                            img: style.img || ''  // 这个字段会在虚拟换发后更新
                        }));
                        
                        console.log('标准化后的发型列表:', hairstyles);
                        
                        // 使用 Promise.all 并行处理每个发型的虚拟换发
                        const virtualHairstyles = await Promise.all(
                            hairstyles.map(async (style) => {
                                try {
                                    console.log(`开始处理发型: ${style.hairstyle}`);
                                    const tryOnResponse = await fetch('https://api.coze.cn/v1/workflow/run', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': 'Bearer pat_XCdzRC2c6K7oMcc2xVJv37KYJR311nrU8uUCPbdnAPlWKaDY9TikL2W8nnkW9cbY',
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            workflow_id: '7472218638747467817',  // 使用同一个 workflow_id
                                            parameters: {
                                                input_image: image,
                                                hairstyle: style.hairstyle
                                            }
                                        })
                                    });

                                    const tryOnData = await tryOnResponse.json();
                                    console.log(`发型 ${style.hairstyle} 换发响应:`, tryOnData);

                                    if (tryOnData.code === 0 && tryOnData.data) {
                                        const outputImage = tryOnData.data.output_image || 
                                             (tryOnData.data.output && tryOnData.data.output.image) ||
                                             (typeof tryOnData.data === 'string' && tryOnData.data) ||
                                             tryOnData.data.image;
                                        
                                        if (outputImage) {
                                            return {
                                                ...style,
                                                img: outputImage
                                            };
                                        }
                                    }
                                    return null;
                                } catch (e) {
                                    console.error(`处理发型 ${style.hairstyle} 失败:`, e);
                                    return null;
                                }
                            })
                        );

                        // 过滤掉失败的结果
                        return virtualHairstyles.filter(style => style !== null);
                    } catch (e) {
                        console.error('解析发型数据失败:', e);
                        return [];
                    }
                }
                return [];
            } catch (e) {
                console.error('获取发型推荐失败:', e);
                return [];
            }
        };
        
        // 并行获取两种搭配的发型推荐
        // 修改获取发型推荐的部分
        const [customHairstyles, generatedHairstyles] = await Promise.all([
        getHairstyleRecommendation(data.custom.tryOnUrl),
        getHairstyleRecommendation(data.generated.tryOnUrl)
        ]);
        
        console.log('Coze API 返回的自选发型数据:', customHairstyles);
        console.log('Coze API 返回的AI推荐发型数据:', generatedHairstyles);
        
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
        console.log('渲染自选发型:', hairstyles.custom);
        
        if (hairstyles.custom.length === 0) {
            return <p>{language === 'en' ? 'No hairstyle recommendations found...' : '没有找到适合自选搭配的发型推荐。'}</p>;
        }

        return (
            <div className="grid grid-cols-2 gap-4">
                {hairstyles.custom.map((style, index) => (
                    <div key={index} className="space-y-3">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-r from-orange-500/20 to-teal-500/20">
                            <img
                                src={style.img}
                                alt={style.hairstyle}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-medium text-gray-900">{style.hairstyle}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{style.reasons}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [hairstyles.custom, language]);

    const renderGeneratedHairstyles = useCallback(() => {
        console.log('渲染AI推荐发型:', hairstyles.generated);
        
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
                                alt={style.hairstyle}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">{style.hairstyle}</h4>
                            <p className="text-sm text-gray-600">{style.reasons}</p>
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
                    {outfit.commentary[language].split('\n').filter(line => line.trim()).map((comment, index) => {
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

    // 添加新的进度状态类型
    interface Progress {
        message: string;
        percent: number;
    }
    
    // 添加新的状态
    const [hairstyleProgress, setHairstyleProgress] = useState<Progress>({ message: '', percent: 0 });
    const [hairstyleLoading, setHairstyleLoading] = useState(false);
    
    // 修改进度条渲染函数
    const renderProgressBar = useCallback(() => {
        if (!loading && !hairstyleLoading) return null;
    
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
                    {loading && (
                        <>
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
                        </>
                    )}
                    {hairstyleLoading && (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">{hairstyleProgress.message}</h3>
                                <span className="text-sm font-medium text-orange-600">{hairstyleProgress.percent}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all duration-500 ease-out"
                                    style={{ width: `${hairstyleProgress.percent}%` }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }, [loading, progress, hairstyleLoading, hairstyleProgress]);
    
    // 修改获取发型推荐的函数
    const getHairstyleRecommendation = async (image: string) => {
        try {
            setHairstyleLoading(true);
            setHairstyleProgress({ message: '正在分析发型风格...', percent: 20 });
    
            // 获取发型推荐
            const response = await fetch('https://api.coze.cn/v1/workflow/run', {
                // ... 保持原有配置不变 ...
            });
    
            setHairstyleProgress({ message: '正在生成发型建议...', percent: 50 });
            const responseData = await response.json();
            
            // 处理发型数据
            setHairstyleProgress({ message: '正在应用虚拟换发...', percent: 75 });
            
            // ... 处理发型数据的代码保持不变 ...
    
            setHairstyleProgress({ message: '完成发型推荐', percent: 100 });
            return processedHairstyles;
    
        } catch (error) {
            console.error('获取发型推荐失败:', error);
            return [];
        } finally {
            setTimeout(() => {
                setHairstyleLoading(false);
                setHairstyleProgress({ message: '', percent: 0 });
            }, 500);
        }
    };
    
    // 修改 handleSubmit 中的发型处理部分
    const handleSubmit = async (event: React.FormEvent) => {
        // ... 其他代码保持不变 ...
    
        try {
            // 处理虚拟换衣
            const data = await handleVirtualTryOn();
            setResult(data);
    
            // 独立处理发型推荐
            const [customHairstyles, generatedHairstyles] = await Promise.all([
                getHairstyleRecommendation(data.custom.tryOnUrl),
                getHairstyleRecommendation(data.generated.tryOnUrl)
            ]);
    
            setHairstyles({
                custom: customHairstyles,
                generated: generatedHairstyles
            });
    
        } catch (error) {
            // ... 错误处理保持不变 ...
        }
    };

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
                                        <h3 className="text-xl font-semibold p-4 bg-gradient-to-r from-orange-600 to-teal-600 text-white flex items-center gap-2">
                                            <Scissors className="w-5 h-5" />
                                            {language === 'en' ? 'Custom Outfit Hairstyles' : '自选搭配发型推荐'}
                                        </h3>
                                        <div className="p-6">
                                            {renderCustomHairstyles()}
                                        </div>
                                    </div>
                                    {/* AI推荐搭配发型 */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                                        <h3 className="text-xl font-semibold p-4 bg-gradient-to-r from-orange-600 to-teal-600 text-white flex items-center gap-2">
                                            <Wand className="w-5 h-5" />
                                            {language === 'en' ? 'AI Recommended Hairstyles' : 'AI推荐发型'}
                                        </h3>
                                        <div className="p-6">
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
