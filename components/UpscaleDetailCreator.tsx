
import React, { useEffect, useRef } from 'react';
import type { SourceImage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Icon } from './icons';
import { ImageDropzone } from './ImageDropzone';
import { sourceImageToDataUrl } from '../utils';
import { AreaSelector } from './ArrowEditor';

interface UpscaleDetailCreatorProps {
    onBack: () => void;
    sourceImage: SourceImage | null;
    setSourceImage: (image: SourceImage | null) => void;
    generatedImages: string[];
    selectedImage: string | null;
    setSelectedImage: (image: string | null) => void;
    handleGenerate: (croppedImage: SourceImage | null) => void;
    isLoading: boolean;
    setFullscreenImage: (url: string | null) => void;
}

export const UpscaleDetailCreator: React.FC<UpscaleDetailCreatorProps> = ({
    onBack,
    sourceImage,
    setSourceImage,
    generatedImages,
    selectedImage,
    setSelectedImage,
    handleGenerate,
    isLoading,
    setFullscreenImage,
}) => {
    const { t } = useLanguage();
    const areaSelectorRef = useRef<{ clear: () => void }>(null);

    useEffect(() => {
        if (generatedImages.length > 0 && !selectedImage) {
            setSelectedImage(generatedImages[0]);
        }
    }, [generatedImages, selectedImage, setSelectedImage]);

    const handleUpload = (image: SourceImage | null) => {
        setSourceImage(image);
        if (!image) {
            areaSelectorRef.current?.clear();
        }
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                     <Icon name="arrows-pointing-out" className="w-8 h-8 text-orange-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('upscaleDetailTitle')}</h2>
                        <p className="text-sm text-slate-500">{t('upscaleDetailDesc')}</p>
                    </div>
                </div>
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100">
                    <Icon name="arrow-uturn-left" className="w-5 h-5" />
                    <span>{t('backToUtilities')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <section>
                        <h3 className="font-semibold text-slate-800 mb-3">{t('uploadImage')}</h3>
                        {sourceImage ? (
                          <div className='space-y-3'>
                              <div className='bg-slate-100 rounded-lg p-2 border border-slate-200'>
                                <img src={sourceImageToDataUrl(sourceImage)} alt="Source" className="w-full h-auto object-contain rounded" />
                              </div>
                              <button onClick={() => handleUpload(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50 flex items-center gap-1 w-full'>
                                <Icon name="trash" className="w-4 h-4" />
                                {t('delete')}
                              </button>
                          </div>
                        ) : (
                          <ImageDropzone onImageUpload={handleUpload} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'>
                              <div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-400">{t('dropzoneFormats')}</p></div>
                          </ImageDropzone>
                        )}
                    </section>
                    {sourceImage && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                                <Icon name="pencil-swoosh" className="w-4 h-4" />
                                {t('selectAreaToUpscale')}
                            </h4>
                            <p className="text-sm text-orange-700">{t('upscaleHelp')}</p>
                        </div>
                    )}
                </div>
                
                <div className="lg:col-span-9 flex flex-col gap-6">
                    {/* Main Workspace */}
                    <div className="flex-grow bg-slate-100 rounded-xl border border-slate-200 min-h-[50vh] flex items-center justify-center relative overflow-hidden group shadow-inner">
                        {sourceImage ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={sourceImageToDataUrl(sourceImage)} alt="Workspace" className="max-w-full max-h-[70vh] object-contain pointer-events-none" />
                                <AreaSelector 
                                    ref={areaSelectorRef}
                                    sourceImage={sourceImage}
                                    onAreaSelected={handleGenerate}
                                    outputMode="crop" 
                                />
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                        <Icon name="sparkles" className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                                        <p className="text-lg font-semibold text-slate-700">{t('generatingUpscale')}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 p-8">
                                <Icon name="arrows-pointing-out" className="w-16 h-16 mx-auto mb-4" />
                                <p>{t('uploadImage')}</p>
                            </div>
                        )}
                    </div>

                    {/* Results Area */}
                    {generatedImages.length > 0 && selectedImage && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Icon name="sparkles" className="w-5 h-5 text-orange-500" />
                                {t('upscaleEmptyHeader')}
                            </h3>
                            <div className="flex gap-6">
                                <div className="flex-grow relative bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center h-[400px]">
                                    <img src={selectedImage} alt="Upscaled Result" className="max-w-full max-h-full object-contain" />
                                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                                        <button onClick={() => setFullscreenImage(selectedImage)} className="bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg" title={t('fullscreen')}>
                                            <Icon name="arrows-pointing-out" className="w-5 h-5" />
                                        </button>
                                        <a href={selectedImage} download={`upscaled-detail-${Date.now()}.png`} className="bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg" title={t('downloadImage')}>
                                            <Icon name="download" className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                                {generatedImages.length > 1 && (
                                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px] w-32 thin-scrollbar pr-2">
                                        {generatedImages.map((img, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setSelectedImage(img)}
                                                className={`w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedImage === img ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200 hover:border-orange-300'}`}
                                            >
                                                <img src={img} alt={`Result ${idx}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
