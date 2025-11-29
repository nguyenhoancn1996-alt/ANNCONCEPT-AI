
import React, { useState, useEffect } from 'react';
import type { ActiveTab, AspectRatio, SourceImage, EditSubMode, ObjectTransform } from '../types';
import { Icon } from './icons';
import { ImageDropzone } from './ImageDropzone';
import { generatePromptFromImage, generatePromptFromKeywords, classifyImageType } from '../services/geminiService';
import { sourceImageToDataUrl, padImageToAspectRatio } from '../utils';
import { ASPECT_RATIO_OPTIONS } from '../constants';
import { ImageEditor } from './ImageEditor';
import { BrushEditor } from './BrushEditor';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../locales/translations';

const PromptInput: React.FC<{ prompt: string, setPrompt: React.Dispatch<React.SetStateAction<string>>, placeholder: string }> = ({ prompt, setPrompt, placeholder }) => {
    const { t } = useLanguage();
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setPrompt(p => p ? `${p} ${text}` : text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    };
    return (
        <>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-slate-800">{t('prompt')}</h3>
                <button onClick={handlePaste} title="Paste" className="text-slate-500 hover:text-orange-500"><Icon name="clipboard" className="w-5 h-5"/></button>
            </div>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-50 p-3 rounded-md h-28 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border border-slate-300 text-slate-900 placeholder-slate-400"
            />
        </>
    );
};

const CreatePanel: React.FC<any> = ({
    sourceImage, setSourceImage, referenceImage, setReferenceImage, prompt, setPrompt,
    negativePrompt, setNegativePrompt,
    imageCount, setImageCount, aspectRatio, setAspectRatio, handleSourceImageUpload,
    useProModel, handleToggleProMode, imageSize, setImageSize
}) => {
    const { language, t } = useLanguage();
    const {
        predefinedReferenceImages, stylePrompts, contextPrompts, lightingPrompts, ASPECT_RATIO_LABELS
    } = translations[language].constants;
    
    // Safety check for constants
    const safePredefinedImages = predefinedReferenceImages || {};
    const safeStylePrompts = stylePrompts || [];
    const safeContextPrompts = contextPrompts || [];
    const safeLightingPrompts = lightingPrompts || [];

    const [showReferenceGallery, setShowReferenceGallery] = useState(false);
    const [selectedReferenceCategory, setSelectedReferenceCategory] = useState<keyof typeof predefinedReferenceImages>('building');
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [isGeneratingPromptFromText, setIsGeneratingPromptFromText] = useState(false);
    const [isProcessingReference, setIsProcessingReference] = useState(false);
    const [imageType, setImageType] = useState<'interior' | 'exterior'>('exterior');

    useEffect(() => {
        if (sourceImage) {
            classifyImageType(sourceImage).then(type => {
                setImageType(type);
            });
        } else {
            setImageType('exterior');
        }
    }, [sourceImage]);


    const handleGeneratePrompt = async () => {
        if (!sourceImage) {
            alert(t('alertUploadSource'));
            return;
        }
        setIsGeneratingPrompt(true);
        try {
            const newPrompt = await generatePromptFromImage(sourceImage, language, imageType);
            setPrompt(newPrompt);
        } catch (error) {
            alert(t('alertGenerationFailed'));
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    const handleGeneratePromptFromKeywords = async () => {
        if (!prompt) {
            alert(t('alertEnterPrompt'));
            return;
        }
        setIsGeneratingPromptFromText(true);
        try {
            const newPrompt = await generatePromptFromKeywords(prompt, language, imageType);
            setPrompt(newPrompt);
        } catch (error) {
            alert(t('alertGenerationFailed'));
        } finally {
            setIsGeneratingPromptFromText(false);
        }
    };

    const handleReferenceImageUpload = async (newReferenceImage: SourceImage) => {
        if (!sourceImage) {
            setReferenceImage(newReferenceImage);
            return;
        }

        setIsProcessingReference(true);
        try {
            const sourceImg = new Image();
            sourceImg.src = sourceImageToDataUrl(sourceImage);
            await new Promise<void>((resolve, reject) => {
                sourceImg.onload = () => resolve();
                sourceImg.onerror = reject;
            });
            const targetAspectRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;

            const paddedImage = await padImageToAspectRatio(newReferenceImage, targetAspectRatio);
            setReferenceImage(paddedImage);

        } catch (error) {
            console.error("Failed to pad reference image:", error);
            alert("Could not process reference image. Using original.");
            setReferenceImage(newReferenceImage);
        } finally {
            setIsProcessingReference(false);
        }
    };

    const handleSetReferenceFromUrl = async (url: string) => {
        setIsProcessingReference(true);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const newReferenceImage = await new Promise<SourceImage>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    const [, base64] = dataUrl.split(',');
                    if (base64) {
                        resolve({ base64, mimeType: blob.type });
                    } else {
                        reject(new Error("Could not read base64 from data URL."));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            
            await handleReferenceImageUpload(newReferenceImage);
            setShowReferenceGallery(false);

        } catch (error) {
            alert("Could not load reference image.");
            setIsProcessingReference(false);
        }
    };

    const handlePromptSelect = (selectedPrompt: string, categoryPrompts: string[]) => {
        if (!selectedPrompt) return;
        setPrompt((currentPrompt: string) => {
            let existingPrompt = categoryPrompts.find(p => currentPrompt.includes(p));
            let newPrompt = currentPrompt;
            if (existingPrompt) newPrompt = newPrompt.replace(existingPrompt, selectedPrompt);
            else newPrompt = newPrompt.trim() === '' ? selectedPrompt : `${newPrompt}, ${selectedPrompt}`;
            return newPrompt;
        });
    };
    
    // Ensure the category exists in the current language, default to empty array if not found
    const categoryImages = safePredefinedImages[selectedReferenceCategory] || [];
    const safeCategoryImages = Array.isArray(categoryImages) ? categoryImages : [];

    return (
        <div className="space-y-6">
            {/* Pro Model Toggle */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${useProModel ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                            <Icon name="cpu-chip" className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className={`text-sm font-semibold ${useProModel ? 'text-orange-600' : 'text-slate-800'}`}>
                                {useProModel ? t('proModeActive') : t('useApiKey')}
                            </h4>
                            <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight mt-0.5">
                                {t('useApiKeyHelp')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleProMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-50 ${useProModel ? 'bg-orange-600' : 'bg-slate-300'}`}
                    >
                        <span
                            className={`${
                                useProModel ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow`}
                        />
                    </button>
                </div>
                
                {useProModel && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-2">{t('imageQuality')}</p>
                        <div className="flex space-x-2">
                            {(['1K', '2K', '4K'] as const).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setImageSize && setImageSize(size)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        imageSize === size
                                            ? 'bg-orange-600 text-white shadow-sm'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <section>
                <h3 className="font-semibold text-slate-800 mb-3">1. {t('uploadImageOptional')}</h3>
                <p className="text-xs text-slate-500 -mt-2 mb-3">{t('handDrawnHint')}</p>
                {sourceImage ? (
                  <div className='space-y-3'>
                      <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                      <button onClick={() => setSourceImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                  </div>
                ) : (
                  <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'>
                      <div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-400">{t('dropzoneFormats')}</p></div>
                  </ImageDropzone>
                )}
            </section>

            <section>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-slate-800">2. {t('referenceImage')}</h3>
                  <button onClick={() => setShowReferenceGallery(!showReferenceGallery)} className="text-sm text-orange-600 hover:text-orange-500 px-2 py-1">{showReferenceGallery ? t('close') : t('choosePresetImage')}</button>
                </div>
                {showReferenceGallery && (
                  <div className="bg-slate-50 p-3 rounded-md mb-3 border border-slate-200">
                    <div className="flex space-x-1 mb-3 border-b border-slate-200 pb-2">
                      {(Object.keys(safePredefinedImages) as Array<keyof typeof safePredefinedImages>).map(cat => (
                        <button key={cat} onClick={() => setSelectedReferenceCategory(cat)} className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-colors ${selectedReferenceCategory === cat ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {safeCategoryImages.length > 0 ? (
                        safeCategoryImages.map(img => <img key={img.url} src={img.url} alt={img.name} onClick={() => handleSetReferenceFromUrl(img.url)} className="w-full h-20 object-cover rounded cursor-pointer hover:ring-2 hover:ring-orange-500 shadow-sm" />)
                      ) : <p className="col-span-2 text-center text-xs text-slate-500 py-4">No images in this category yet.</p>}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500 mb-3">{t('referenceImageHelp')}</p>
                {isProcessingReference ? (
                    <div className='w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm'>
                        <p>{t('processingImage')}</p>
                    </div>
                ) : referenceImage ? (
                  <div className="relative group">
                    <ImageDropzone onImageUpload={handleReferenceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(referenceImage)} alt="Reference" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                    <button onClick={() => setReferenceImage(null)} className="absolute top-3 right-3 bg-white/80 rounded-full text-slate-800 hover:bg-white p-1 opacity-0 group-hover:opacity-100 z-10 shadow-sm"><Icon name="x-circle" className="w-5 h-5" /></button>
                  </div>
                ) : <ImageDropzone onImageUpload={handleReferenceImageUpload} className='w-full h-32 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><p>{t('dropzoneHint')}</p></ImageDropzone>}
            </section>

            <section>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-slate-800">3. {t('prompt')}</h3>
                    <button onClick={async () => {
                        const text = await navigator.clipboard.readText();
                        setPrompt((p: string) => p ? `${p} ${text}` : text);
                    }} title="Paste" className="text-slate-500 hover:text-orange-500"><Icon name="clipboard" className="w-5 h-5"/></button>
                </div>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('promptPlaceholder.create')}
                    className="w-full bg-slate-50 p-3 rounded-md h-28 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border border-slate-300 text-slate-900 placeholder-slate-400"
                />
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500 mb-1">{t('addFromPresets')}</p>
                  <select onChange={(e) => handlePromptSelect(e.target.value, safeStylePrompts)} value="" className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800 cursor-pointer" style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('style')}</option>{safeStylePrompts.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  <select onChange={(e) => handlePromptSelect(e.target.value, safeContextPrompts)} value="" className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800 cursor-pointer" style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('context')}</option>{safeContextPrompts.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  <select onChange={(e) => handlePromptSelect(e.target.value, safeLightingPrompts)} value="" className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800 cursor-pointer" style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('lighting')}</option>{safeLightingPrompts.map(p => <option key={p} value={p}>{p}</option>)}</select>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button 
                        onClick={handleGeneratePrompt} 
                        disabled={!sourceImage || isGeneratingPrompt || isGeneratingPromptFromText}
                        className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon name="sparkles" className={`w-5 h-5 ${isGeneratingPrompt ? 'animate-spin' : ''}`} />
                        {isGeneratingPrompt ? t('generating') : t('generateFromImage')}
                    </button>
                    <button 
                        onClick={handleGeneratePromptFromKeywords} 
                        disabled={!prompt || isGeneratingPromptFromText || isGeneratingPrompt}
                        className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <Icon name="sparkles" className={`w-5 h-5 ${isGeneratingPromptFromText ? 'animate-spin' : ''}`} />
                        {isGeneratingPromptFromText ? t('generating') : t('generateFromPromptText')}
                    </button>
                </div>
            </section>

             <section>
                <h3 className="font-semibold text-slate-800 mb-2">4. {t('negativePrompt')}</h3>
                <p className="text-xs text-slate-500 mb-3">{t('negativePromptHelp')}</p>
                 <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder={t('promptPlaceholder.negative')}
                    className="w-full bg-slate-50 p-3 rounded-md h-20 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border border-slate-300 text-slate-900 placeholder-slate-400"
                />
            </section>

             <section>
                <h3 className="font-semibold text-slate-800 mb-2">5. {t('aspectRatio')}</h3>
                <p className="text-xs text-slate-500 mb-3">{t('aspectRatioHelp')}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    {ASPECT_RATIO_OPTIONS.map(ratio => (
                        <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-2 px-2 text-center rounded-md border transition-colors ${aspectRatio === ratio ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'}`}>{ASPECT_RATIO_LABELS[ratio]}</button>
                    ))}
                </div>
              </section>

              <section>
                  <h3 className="font-semibold text-slate-800 mb-2">6. {t('imageCount')}</h3>
                  <div className="flex items-center justify-between bg-slate-50 rounded-md p-2 border border-slate-300">
                      <button onClick={() => setImageCount((c: number) => Math.max(1, c - 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">-</button>
                      <span className="text-lg font-semibold text-slate-900">{imageCount}</span>
                      <button onClick={() => setImageCount((c: number) => Math.min(10, c + 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">+</button>
                  </div>
              </section>
        </div>
    );
};

const CameraAnglePanel: React.FC<any> = ({ sourceImage, setSourceImage, prompt, setPrompt, imageCount, setImageCount, isSelectingArea, setIsSelectingArea, areaSelectorRef, handleSourceImageUpload }) => {
    const { t, language } = useLanguage();
    const { cameraAnglePrompts } = translations[language].constants;
    const safeCameraAnglePrompts = cameraAnglePrompts || [];

    const handleToggleSelectingArea = () => {
        if (!isSelectingArea) {
            areaSelectorRef.current?.clear();
        }
        setIsSelectingArea((prev: boolean) => !prev);
    };

    const handleClearSelection = () => {
        areaSelectorRef.current?.clear();
        if (isSelectingArea) setIsSelectingArea(false);
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold text-slate-800 mb-3">1. {t('uploadImage')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                        <button onClick={() => setSourceImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                    </div>
                ) : <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-400">{t('dropzoneFormats')}</p></div></ImageDropzone>}
            </section>

            {sourceImage && (
                <section>
                    <h3 className="font-semibold text-slate-800 mb-3">2. {t('specifyCloseUpAngle')}</h3>
                    <p className="text-xs text-slate-500 mb-3">{t('specifyCloseUpHelp')}</p>
                    <div className='flex items-center gap-2'>
                        <button onClick={handleToggleSelectingArea} className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-lg transition-colors ${isSelectingArea ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}><Icon name="pencil-swoosh" className="w-5 h-5" />{isSelectingArea ? t('cancel') : t('selectArea')}</button>
                        {(isSelectingArea) && (<button onClick={handleClearSelection} className='flex-shrink-0 flex items-center justify-center gap-2 text-sm text-slate-700 hover:text-slate-900 px-3 py-2.5 rounded-md bg-slate-200 hover:bg-slate-300' title={t('clearSelection')}><Icon name="trash" className="w-4 h-4" /></button>)}
                    </div>
                </section>
            )}

            <div className={`${isSelectingArea ? 'opacity-50 pointer-events-none' : ''} transition-opacity space-y-6`}>
                <section>
                    <h3 className="font-semibold text-slate-800 mb-3">3. {t('chooseCameraAngle')}</h3>
                    <select disabled={isSelectingArea} value={safeCameraAnglePrompts.some(p => p.value === prompt) ? prompt : ""} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800" style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}><option value="" disabled>{t('selectCameraAnglePlaceholder')}</option>{safeCameraAnglePrompts.map(p => <option key={p.display} value={p.value}>{p.display}</option>)}</select>
                </section>
                <section>
                    <h3 className="font-semibold text-slate-800 mb-2">4. {t('customDescription')}</h3>
                    <textarea disabled={isSelectingArea} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('customDescriptionPlaceholder')} className="w-full bg-slate-50 p-3 rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none border border-slate-300 text-slate-900 placeholder-slate-400"/>
                </section>
            </div>
            
            <section>
                <h3 className="font-semibold text-slate-800 mb-2">5. {t('imageCount')}</h3>
                <div className="flex items-center justify-between bg-slate-50 rounded-md p-2 border border-slate-300">
                    <button onClick={() => setImageCount((c: number) => Math.max(1, c - 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">-</button>
                    <span className="text-lg font-semibold text-slate-900">{imageCount}</span>
                    <button onClick={() => setImageCount((c: number) => Math.min(10, c + 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">+</button>
                </div>
            </section>
        </div>
    );
};

const EditPanel: React.FC<any> = ({ 
    sourceImage, setSourceImage, prompt, setPrompt, imageCount, setImageCount, 
    editReferenceImage, setEditReferenceImage, editTool, setEditTool, brushSize, setBrushSize, 
    lassoEditorRef, brushEditorRef, handleSourceImageUpload, setMaskImage,
    editSubMode, setEditSubMode, sourceImage2, setSourceImage2 
}) => {
    const { t, language } = useLanguage();
    const { materialChangeOptions, furnitureChangeOptions, predefinedMaterialImages } = translations[language].constants;
    
    // Safeguard constants
    const safeMaterialChangeOptions = materialChangeOptions || [];
    const safeFurnitureChangeOptions = furnitureChangeOptions || [];
    const safePredefinedMaterialImages = predefinedMaterialImages || {};

    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);
    const [showMaterialGallery, setShowMaterialGallery] = useState(false);
    const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<keyof typeof predefinedMaterialImages>('Vietceramics');
    const [isProcessingMaterialRef, setIsProcessingMaterialRef] = useState(false);
    
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleEditReferenceImageUpload = async (newReferenceImage: SourceImage) => {
        if (!sourceImage) {
            setEditReferenceImage(newReferenceImage);
            return;
        }

        try {
            const sourceImg = new Image();
            sourceImg.src = sourceImageToDataUrl(sourceImage);
            await new Promise<void>((resolve, reject) => {
                sourceImg.onload = () => resolve();
                sourceImg.onerror = reject;
            });
            const targetAspectRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;

            const paddedImage = await padImageToAspectRatio(newReferenceImage, targetAspectRatio);
            setEditReferenceImage(paddedImage);

        } catch (error) {
            console.error("Failed to pad edit reference image:", error);
            alert("Could not process reference image. Using original.");
            setEditReferenceImage(newReferenceImage);
        }
    };

    const handleSourceImage2Upload = async (newImage: SourceImage) => {
        if (sourceImage && editSubMode !== 'inpaint') {
            const loadingPrompt = prompt;
            setPrompt(t('processingImage'));
            try {
                const img1 = new Image();
                img1.src = sourceImageToDataUrl(sourceImage);
                await new Promise((resolve, reject) => {
                    img1.onload = resolve;
                    img1.onerror = reject;
                });
                
                const targetAspectRatio = img1.naturalWidth / img1.naturalHeight;
                const paddedImage = await padImageToAspectRatio(newImage, targetAspectRatio);
                setSourceImage2(paddedImage);
            } catch (error) {
                console.error("Failed to pad image:", error);
                alert("Could not auto-adjust image ratio. Using original.");
                setSourceImage2(newImage);
            } finally {
                setPrompt(loadingPrompt);
            }
        } else {
            setSourceImage2(newImage);
        }
    };

    const handleSetMaterialFromUrl = async (url: string) => {
        setIsProcessingMaterialRef(true);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const newImage = await new Promise<SourceImage>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result as string;
                    const [, base64] = dataUrl.split(',');
                    if (base64) {
                        resolve({ base64, mimeType: blob.type });
                    } else {
                        reject(new Error("Could not read base64 from data URL."));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(blob);
            });
            
            await handleSourceImage2Upload(newImage);
            setShowMaterialGallery(false);

        } catch (error) {
            console.error("Could not load material image:", error);
            alert("Could not load material image.");
        } finally {
            setIsProcessingMaterialRef(false);
        }
    };

    const handleSubModeChange = (mode: EditSubMode) => {
        setEditSubMode(mode);
        if (mode === 'mergeHouse') setPrompt('Ghép công trình từ ảnh 2 vào bối cảnh của ảnh 1, giữ nguyên ánh sáng và cây cối của ảnh 1.');
        else if (mode === 'mergeMaterial') setPrompt('Sử dụng vật liệu từ ảnh 2 và áp dụng nó lên bề mặt tường của tòa nhà trong ảnh 1. Giữ nguyên hình khối kiến trúc của ảnh 1.');
        else if (mode === 'mergeFurniture') setPrompt('Thay thế đồ nội thất trong ảnh 1 (ví dụ: ghế sofa) bằng đồ vật tương ứng từ ảnh 2. Giữ nguyên bối cảnh, ánh sáng và không gian nội thất của ảnh 1.');
        else if (mode === 'inpaint') setPrompt('');
    };
    
    // Ensure category exists and is an array
    const categoryMaterials = safePredefinedMaterialImages[selectedMaterialCategory] || [];
    const safeCategoryMaterials = Array.isArray(categoryMaterials) ? categoryMaterials : [];

    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold text-slate-800 mb-2">1. {t('chooseFunction')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button onClick={() => handleSubModeChange('inpaint')} className={`py-2 px-2 text-center rounded-md border transition-colors ${editSubMode === 'inpaint' ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'}`}>{t('editSelectedArea')}</button>
                    <button onClick={() => handleSubModeChange('mergeHouse')} className={`py-2 px-2 text-center rounded-md border transition-colors ${editSubMode === 'mergeHouse' ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'}`}>{t('mergeHouse')}</button>
                    <button onClick={() => handleSubModeChange('mergeMaterial')} className={`py-2 px-2 text-center rounded-md border transition-colors ${editSubMode === 'mergeMaterial' ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'}`}>{t('mergeMaterial')}</button>
                    <button onClick={() => handleSubModeChange('mergeFurniture')} className={`py-2 px-2 text-center rounded-md border transition-colors ${editSubMode === 'mergeFurniture' ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'}`}>{t('mergeFurniture')}</button>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">{t(`editFunctionHelp.${editSubMode}`)}</p>
            </section>

            <section>
                <h3 className="font-semibold text-slate-800 mb-3">
                    {editSubMode === 'inpaint' ? `2. ${t('uploadSourceImage')}` : 
                     editSubMode === 'mergeHouse' ? `2. ${t('uploadContextImage')}` : `2. ${t('uploadSourceImage')} (Image 1)`}
                </h3>
                {editSubMode === 'mergeHouse' && (
                  <p className="text-xs text-slate-500 mb-3">{t('contextImageHelp')}</p>
                )}
                {sourceImage ? (
                    <div className='space-y-2'>
                        <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg">
                            <div className="relative bg-slate-100 p-2 rounded-lg border border-slate-200">
                                <img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded-lg" />
                                {isMobile && editSubMode === 'inpaint' && (editTool === 'lasso' ? <ImageEditor ref={lassoEditorRef} sourceImage={sourceImage} onMaskReady={setMaskImage} strokeWidth={brushSize}/> : <BrushEditor ref={brushEditorRef} sourceImage={sourceImage} onMaskReady={setMaskImage} brushSize={brushSize}/>)}
                            </div>
                        </ImageDropzone>
                        <button onClick={() => setSourceImage(null)} className='text-sm text-red-500 hover:text-red-600 w-full text-left px-3 py-1.5 rounded-md hover:bg-red-50'>{t('resetImage')}</button>
                    </div>
                ) : <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-400">{t('dropzoneFormats')}</p></div></ImageDropzone>}
            </section>

            {sourceImage && (
                <>
                    {editSubMode === 'inpaint' ? (
                        <>
                            <section>
                                <h3 className="font-semibold text-slate-800 mb-3">3. {t('chooseToolAndDraw')}</h3>
                                 <div className="flex bg-slate-100 rounded-md p-1 space-x-1 mb-4 border border-slate-200">
                                    <button onClick={() => setEditTool('lasso')} className={`w-1/2 py-2 text-sm rounded transition-colors ${editTool === 'lasso' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200'}`}>{t('lassoTool')}</button>
                                    <button onClick={() => setEditTool('brush')} className={`w-1/2 py-2 text-sm rounded transition-colors ${editTool === 'brush' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200'}`}>{t('brushTool')}</button>
                                </div>
                                <button onClick={() => { if (editTool === 'lasso') lassoEditorRef.current?.clear(); else brushEditorRef.current?.clear(); setMaskImage(null); }} className='w-full flex items-center justify-center gap-2 text-sm text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors'><Icon name="arrow-uturn-left" className="w-4 h-4" />{t('clearSelection')}</button>
                                <div className='mt-4 space-y-2'>
                                    <label htmlFor="brushSize" className="text-sm font-medium text-slate-600">{editTool === 'lasso' ? t('lineThickness') : t('brushSize')}: {brushSize}px</label>
                                    <input id="brushSize" type="range" min="1" max={editTool === 'lasso' ? 10 : 50} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                                </div>
                            </section>
                            <section>
                                <h3 className="font-semibold text-slate-800 mb-3">4. {t('uploadReferenceOptional')}</h3>
                                <p className="text-xs text-slate-500 mb-3">{t('referenceImageHelpEdit')}</p>
                                {editReferenceImage ? (
                                    <div className="relative group">
                                        <ImageDropzone onImageUpload={handleEditReferenceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(editReferenceImage)} alt="Edit Reference" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                                        <button onClick={() => setEditReferenceImage(null)} className="absolute top-3 right-3 bg-white/80 rounded-full text-slate-800 hover:bg-white p-1 opacity-0 group-hover:opacity-100 z-10 shadow-sm"><Icon name="x-circle" className="w-5 h-5" /></button>
                                    </div>
                                ) : <ImageDropzone onImageUpload={handleEditReferenceImageUpload} className='w-full h-32 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><p>{t('dropzoneHint')}</p></ImageDropzone>}
                            </section>
                            <section>
                               <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={t('promptPlaceholder.inpaint')} />
                            </section>
                        </>
                    ) : (
                        <>
                           <section>
                                <h3 className="font-semibold text-slate-800 mb-3">{editSubMode === 'mergeHouse' ? `3. ${t('uploadBuildingImage')}` : `3. ${t('uploadMaterialFurnitureImage')}`}</h3>
                                <p className="text-xs text-slate-500 mb-3">{t('image2Help')}</p>

                                {(editSubMode === 'mergeMaterial' || editSubMode === 'mergeFurniture') && (
                                    <>
                                        <div className="flex justify-end mb-2">
                                            <button onClick={() => setShowMaterialGallery(!showMaterialGallery)} className="text-sm text-orange-600 hover:text-orange-500 px-2 py-1">
                                                {showMaterialGallery ? t('close') : t('choosePresetMaterial')}
                                            </button>
                                        </div>
                                        {showMaterialGallery && (
                                          <div className="bg-slate-50 p-3 rounded-md mb-3 border border-slate-200">
                                            <div className="flex space-x-1 mb-3 border-b border-slate-200 pb-2">
                                              {(Object.keys(safePredefinedMaterialImages) as Array<keyof typeof safePredefinedMaterialImages>).map(cat => (
                                                <button key={cat} onClick={() => setSelectedMaterialCategory(cat)} className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-colors ${selectedMaterialCategory === cat ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}>{cat}</button>
                                              ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                              {safeCategoryMaterials.length > 0 ? (
                                                safeCategoryMaterials.map(img => <img key={img.url} src={img.url} alt={img.name} onClick={() => handleSetMaterialFromUrl(img.url)} className="w-full h-20 object-cover rounded cursor-pointer hover:ring-2 hover:ring-orange-500 shadow-sm" />)
                                              ) : <p className="col-span-2 text-center text-xs text-slate-500 py-4">No images in this category yet.</p>}
                                            </div>
                                          </div>
                                        )}
                                    </>
                                )}

                                {isProcessingMaterialRef ? (
                                    <div className='w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm'>
                                        <p>{t('loadingReference')}</p>
                                    </div>
                                ) : sourceImage2 ? (
                                    <div className='space-y-3'>
                                        <ImageDropzone onImageUpload={handleSourceImage2Upload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage2)} alt="Source 2" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                                        <button onClick={() => setSourceImage2(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                                    </div>
                                ) : <ImageDropzone onImageUpload={handleSourceImage2Upload} className='w-full h-32 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><div><p>{t('dropzoneHint')}</p></div></ImageDropzone>}
                            </section>
                            <section>
                                <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={t(`promptPlaceholder.${editSubMode}`)}/>
                                {(editSubMode === 'mergeMaterial' || editSubMode === 'mergeFurniture') && (
                                    <div className="mt-3">
                                        <p className="text-xs text-slate-500 mb-1">{t('promptExamples')}</p>
                                        <select
                                            value={(editSubMode === 'mergeMaterial' ? safeMaterialChangeOptions : safeFurnitureChangeOptions).some(opt => opt.value === prompt) ? prompt : ""}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800 cursor-pointer"
                                            style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}
                                        >
                                            <option value="" disabled>{t('selectOption')}</option>
                                            {(editSubMode === 'mergeMaterial' ? safeMaterialChangeOptions : safeFurnitureChangeOptions).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.display}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                    <section>
                        <h3 className="font-semibold text-slate-800 mb-2">5. {t('imageCount')}</h3>
                        <div className="flex items-center justify-between bg-slate-50 rounded-md p-2 border border-slate-300">
                            <button onClick={() => setImageCount((c: number) => Math.max(1, c - 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">-</button>
                            <span className="text-lg font-semibold text-slate-900">{imageCount}</span>
                            <button onClick={() => setImageCount((c: number) => Math.min(10, c + 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">+</button>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

const PlanTo3dPanel: React.FC<any> = ({ sourceImage, setSourceImage, prompt, setPrompt, imageCount, setImageCount, referenceImage, setReferenceImage, planTo3dMode, setPlanTo3dMode, handleSourceImageUpload }) => {
    const { t, language } = useLanguage();
    const { planStylePrompts, planColorizePrompts } = translations[language].constants;
    const [isProcessingReference, setIsProcessingReference] = useState(false);
    
    // Safeguard constants
    const safePlanStylePrompts = planStylePrompts || [];
    const safePlanColorizePrompts = planColorizePrompts || [];

     const handleModeChange = (mode: 'render' | 'colorize') => {
        setPlanTo3dMode(mode);
        if (mode === 'render') setPrompt(t('promptPlanTo3d'));
        else setPrompt('');
    };

    const handlePlanReferenceImageUpload = async (newReferenceImage: SourceImage) => {
        if (!sourceImage) {
            setReferenceImage(newReferenceImage);
            return;
        }

        setIsProcessingReference(true);
        try {
            const sourceImg = new Image();
            sourceImg.src = sourceImageToDataUrl(sourceImage);
            await new Promise<void>((resolve, reject) => {
                sourceImg.onload = () => resolve();
                sourceImg.onerror = reject;
            });
            const targetAspectRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;

            const paddedImage = await padImageToAspectRatio(newReferenceImage, targetAspectRatio);
            setReferenceImage(paddedImage);

        } catch (error) {
            console.error("Failed to pad reference image for plan:", error);
            alert("Could not process reference image. Using original.");
            setReferenceImage(newReferenceImage);
        } finally {
            setIsProcessingReference(false);
        }
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold text-slate-800 mb-3">1. {t('upload2dPlan')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Floor plan" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                        <button onClick={() => setSourceImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                    </div>
                ) : <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-400">{t('dropzoneFormats')}</p></div></ImageDropzone>}
            </section>
            <section>
                <h3 className="font-semibold text-slate-800 mb-2">2. {t('chooseGoal')}</h3>
                <div className="flex bg-slate-100 rounded-md p-1 space-x-1 border border-slate-200">
                    <button onClick={() => handleModeChange('render')} className={`w-1/2 py-2 text-sm rounded transition-colors ${planTo3dMode === 'render' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200'}`}>{t('create3DImage')}</button>
                    <button onClick={() => handleModeChange('colorize')} className={`w-1/2 py-2 text-sm rounded transition-colors ${planTo3dMode === 'colorize' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200'}`}>{t('colorizePlan')}</button>
                </div>
            </section>
            {planTo3dMode === 'render' && (
                <section>
                    <h3 className="font-semibold text-slate-800">3. {t('referenceImage')}</h3>
                    {isProcessingReference ? (
                        <div className='w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm'>
                            <p>{t('processingImage')}</p>
                        </div>
                    ) : referenceImage ? (
                        <div className="relative group">
                            <ImageDropzone onImageUpload={handlePlanReferenceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(referenceImage)} alt="Reference" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                            <button onClick={() => setReferenceImage(null)} className="absolute top-3 right-3 bg-white/80 rounded-full text-slate-800 hover:bg-white p-1 opacity-0 group-hover:opacity-100 z-10 shadow-sm"><Icon name="x-circle" className="w-5 h-5" /></button>
                        </div>
                    ) : <ImageDropzone onImageUpload={handlePlanReferenceImageUpload} className='w-full h-32 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><p>{t('dropzoneHint')}</p></ImageDropzone>}
                </section>
            )}
            <section>
                <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={planTo3dMode === 'render' ? t('promptPlaceholder.planTo3dRender') : t('promptPlaceholder.planTo3dColorize')} />
                 <div className="mt-3 space-y-2">
                     <select onChange={(e) => setPrompt(prompt + ", " + e.target.value)} value="" className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800 cursor-pointer" style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}>
                        <option value="" disabled>{t('suggestions')}</option>
                        {(planTo3dMode === 'render' ? safePlanStylePrompts : safePlanColorizePrompts).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                </div>
            </section>
        </div>
    );
};

const VideoPanel: React.FC<any> = ({ sourceImage, handleSourceImageUpload, setSourceImage, prompt, setPrompt }) => {
    const { t, language } = useLanguage();
    const { videoPrompts } = translations[language].constants;
    const safeVideoPrompts = videoPrompts || [];

    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold text-slate-800 mb-3">1. {t('uploadImage')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                        <button onClick={() => setSourceImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                    </div>
                ) : <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'><div><p>{t('dropzoneHint')}</p></div></ImageDropzone>}
            </section>
            <section>
                <h3 className="font-semibold text-slate-800 mb-2">2. {t('motionDescription')}</h3>
                <PromptInput prompt={prompt} setPrompt={setPrompt} placeholder={t('promptPlaceholder.video')}/>
                 <div className="mt-3 space-y-2">
                     <select value={safeVideoPrompts.some(p => p.value === prompt) ? prompt : ""} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-slate-50 p-3 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none appearance-none border border-slate-300 text-slate-800 cursor-pointer" style={{ background: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") right 0.5rem center/1.5em 1.5em no-repeat`}}>
                        <option value="" disabled>{t('selectSuggestion')}</option>
                        {safeVideoPrompts.map(p => <option key={p.display} value={p.value}>{p.display}</option>)}
                      </select>
                </div>
            </section>
        </div>
    );
};

const CanvaPanel: React.FC<any> = ({
    sourceImage, handleSourceImageUpload, setSourceImage,
    canvaObjects, setCanvaObjects, canvaObjectTransforms, setCanvaObjectTransforms,
    selectedCanvaObjectIndex, setSelectedCanvaObjectIndex, isCanvaLayoutLocked, setIsCanvaLayoutLocked,
    handleDeleteSelectedCanvaObject
}) => {
    const { t } = useLanguage();
    const safeCanvaObjects = Array.isArray(canvaObjects) ? canvaObjects : [];

    const handleDecorUpload = async (images: SourceImage[]) => {
        if (!sourceImage) {
            alert(t('alertUploadBg'));
            return;
        }

        try {
            const bgImg = new Image();
            bgImg.src = sourceImageToDataUrl(sourceImage);
            await new Promise((resolve, reject) => {
                bgImg.onload = () => resolve(null);
                bgImg.onerror = reject;
            });
            
            const newObjects: SourceImage[] = [...images];
            const newTransforms: ObjectTransform[] = images.map(() => ({
                x: 50,
                y: 50,
                scale: 30, // Initial scale %
                rotation: 0,
                flipHorizontal: false,
                flipVertical: false,
            }));

            setCanvaObjects((prev: any) => [...prev, ...newObjects]);
            setCanvaObjectTransforms((prev: any) => [...prev, ...newTransforms]);
            setSelectedCanvaObjectIndex(safeCanvaObjects.length + newObjects.length - 1);

        } catch (error) {
            console.error("Error processing decor images", error);
        }
    };

    const handleUpdateTransform = (key: keyof ObjectTransform, value: number | boolean) => {
        if (selectedCanvaObjectIndex === null) return;
        setCanvaObjectTransforms((prev: any) => prev.map((t: any, i: number) => 
            i === selectedCanvaObjectIndex ? { ...t, [key]: value } : t
        ));
    };

    const selectedTransform = selectedCanvaObjectIndex !== null ? canvaObjectTransforms[selectedCanvaObjectIndex] : null;

    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold text-slate-800 mb-3">1. {t('uploadSpaceImage')}</h3>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg"><div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Space" className="w-full h-auto object-contain rounded" /></div></ImageDropzone>
                        <button onClick={() => setSourceImage(null)} className='text-sm text-red-500 hover:text-red-600 w-full text-left px-3 py-1.5 rounded-md hover:bg-red-50'>{t('changeBgImage')}</button>
                    </div>
                ) : (
                    <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'>
                        <div><p>{t('dropzoneHint')}</p></div>
                    </ImageDropzone>
                )}
            </section>

            <section>
                <h3 className="font-semibold text-slate-800 mb-3">2. {t('uploadDecorImage')}</h3>
                <p className="text-xs text-slate-500 -mt-2 mb-3">{t('decorHelp')}</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {safeCanvaObjects.map((obj: SourceImage, idx: number) => (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedCanvaObjectIndex(idx)}
                            className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${selectedCanvaObjectIndex === idx ? 'border-orange-500' : 'border-transparent'}`}
                        >
                            <img src={sourceImageToDataUrl(obj)} className="w-full h-full object-contain bg-slate-100" alt="decor"/>
                        </div>
                    ))}
                    <ImageDropzone onImagesUpload={handleDecorUpload} multiple className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-100 text-slate-400">
                        <Icon name="plus-circle" className="w-6 h-6" />
                    </ImageDropzone>
                </div>
                {safeCanvaObjects.length > 0 && (
                    <button onClick={() => { setCanvaObjects([]); setCanvaObjectTransforms([]); setSelectedCanvaObjectIndex(null); }} className='text-xs text-red-500 hover:text-red-600 flex items-center gap-1'>
                        <Icon name="trash" className="w-3 h-3" /> {t('deleteAll')}
                    </button>
                )}
            </section>

            {selectedTransform && (
                <section className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-800 mb-2 text-sm">{t('adjustments')}</h3>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-slate-500 flex justify-between">
                                {t('rotate')} <span>{Math.round(selectedTransform.rotation)}°</span>
                            </label>
                            <input 
                                type="range" min="0" max="360" 
                                value={selectedTransform.rotation} 
                                onChange={(e) => handleUpdateTransform('rotation', Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleUpdateTransform('flipHorizontal', !selectedTransform.flipHorizontal)}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${selectedTransform.flipHorizontal ? 'bg-orange-600 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                            >
                                {t('flipHorizontal')}
                            </button>
                            <button 
                                onClick={() => handleUpdateTransform('flipVertical', !selectedTransform.flipVertical)}
                                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${selectedTransform.flipVertical ? 'bg-orange-600 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                            >
                                {t('flipVertical')}
                            </button>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-200">
                             <button 
                                onClick={() => setIsCanvaLayoutLocked(!isCanvaLayoutLocked)}
                                className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center gap-1 transition-colors ${isCanvaLayoutLocked ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                            >
                                <Icon name={isCanvaLayoutLocked ? "cpu-chip" : "cpu-chip"} className="w-3 h-3" />
                                {t('lockLayout')}
                            </button>
                            <button 
                                onClick={handleDeleteSelectedCanvaObject}
                                className="flex-1 py-1.5 text-xs rounded bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center gap-1 transition-colors"
                            >
                                <Icon name="trash" className="w-3 h-3" />
                                {t('deleteObject')}
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

const PromptGenPanel: React.FC<any> = ({ 
    sourceImage, handleSourceImageUpload, setSourceImage, 
    characterImage, setCharacterImage 
}) => {
    const { t } = useLanguage();
    
    return (
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold text-slate-800 mb-3">1. {t('uploadToAnalyze')}</h3>
                <p className="text-xs text-slate-500 -mt-2 mb-3">{t('analyzeHelp')}</p>
                {sourceImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={handleSourceImageUpload} className="cursor-pointer rounded-lg">
                            <div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" /></div>
                        </ImageDropzone>
                        <button onClick={() => setSourceImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                    </div>
                ) : (
                    <ImageDropzone onImageUpload={handleSourceImageUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'>
                        <div><p>{t('dropzoneHint')}</p></div>
                    </ImageDropzone>
                )}
            </section>

            <section>
                <h3 className="font-semibold text-slate-800 mb-3">2. {t('uploadCharacterImage')}</h3>
                <p className="text-xs text-slate-500 -mt-2 mb-3">{t('characterHelp')}</p>
                {characterImage ? (
                    <div className='space-y-3'>
                        <ImageDropzone onImageUpload={setCharacterImage} className="cursor-pointer rounded-lg">
                            <div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(characterImage)} alt="Character" className="w-full h-auto object-contain rounded" /></div>
                        </ImageDropzone>
                        <button onClick={() => setCharacterImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                    </div>
                ) : (
                    <ImageDropzone onImageUpload={setCharacterImage} className='w-full h-32 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'>
                        <div><p>{t('dropzoneHint')}</p></div>
                    </ImageDropzone>
                )}
            </section>
        </div>
    );
};

export const ControlPanel: React.FC<any> = (props) => {
    const { activeTab, handleGeneration, isLoading } = props;
    const { t } = useLanguage();

    const renderPanel = () => {
        switch(activeTab) {
            case 'create': return <CreatePanel {...props} />;
            case 'cameraAngle': return <CameraAnglePanel {...props} />;
            case 'edit': return <EditPanel {...props} />;
            case 'planTo3d': return <PlanTo3dPanel {...props} />;
            case 'video': return <VideoPanel {...props} />;
            case 'canva': return <CanvaPanel {...props} />;
            case 'prompt': return <PromptGenPanel {...props} />;
            default: return null;
        }
    };

    const getGenerateButtonLabel = () => {
        if (activeTab === 'video') return t('createVideo');
        if (activeTab === 'prompt') return t('createPrompt');
        return t('createImage');
    };

    return (
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex-grow overflow-y-auto max-h-[85vh] thin-scrollbar">
                {renderPanel()}
                
                {/* Generation Button - Shown for most tabs except utilities/beta/library which are handled elsewhere or have no generic generate */}
                {['create', 'cameraAngle', 'edit', 'planTo3d', 'video', 'canva', 'prompt'].includes(activeTab) && (
                    <div className="mt-6 pt-4 border-t border-slate-200 sticky bottom-0 bg-white pb-2">
                        <button
                            onClick={handleGeneration}
                            disabled={isLoading}
                            className={`w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-orange-500/20 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <>
                                    <Icon name="sparkles" className="w-5 h-5 animate-spin" />
                                    <span>{t('generating')}</span>
                                </>
                            ) : (
                                <>
                                    <Icon name={activeTab === 'video' ? 'video-camera' : activeTab === 'prompt' ? 'clipboard' : 'sparkles'} className="w-5 h-5" />
                                    <span>{getGenerateButtonLabel()}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
