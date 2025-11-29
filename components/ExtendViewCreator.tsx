import React, { useEffect } from 'react';
import type { SourceImage, AspectRatio } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Icon } from './icons';
import { ImageDropzone } from './ImageDropzone';
import { sourceImageToDataUrl } from '../utils';
import { ASPECT_RATIO_OPTIONS } from '../constants';
import { translations } from '../locales/translations';

interface ExtendViewCreatorProps {
    onBack: () => void;
    extendViewSourceImage: SourceImage | null;
    setExtendViewSourceImage: (image: SourceImage | null) => void;
    extendViewAspectRatio: AspectRatio;
    setExtendViewAspectRatio: (ratio: AspectRatio) => void;
    extendViewImageCount: number;
    setExtendViewImageCount: (count: number) => void;
    extendViewGeneratedImages: string[];
    extendViewSelectedImage: string | null;
    setExtendViewSelectedImage: (image: string | null) => void;
    handleExtendViewGeneration: () => void;
    isLoading: boolean;
    setFullscreenImage: (url: string | null) => void;
}

export const ExtendViewCreator: React.FC<ExtendViewCreatorProps> = ({
    onBack,
    extendViewSourceImage: sourceImage,
    setExtendViewSourceImage: setSourceImage,
    extendViewAspectRatio: aspectRatio,
    setExtendViewAspectRatio: setAspectRatio,
    extendViewImageCount: imageCount,
    setExtendViewImageCount: setImageCount,
    extendViewGeneratedImages: generatedImages,
    extendViewSelectedImage: selectedImage,
    setExtendViewSelectedImage: setSelectedImage,
    handleExtendViewGeneration: handleGenerate,
    isLoading,
    setFullscreenImage,
}) => {
    const { t, language } = useLanguage();
    const { ASPECT_RATIO_LABELS } = translations[language].constants;

    useEffect(() => {
        if (generatedImages.length > 0 && !selectedImage) {
            setSelectedImage(generatedImages[0]);
        }
    }, [generatedImages, selectedImage, setSelectedImage]);

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                     <Icon name="arrows-pointing-out" className="w-8 h-8 text-orange-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('extendViewTitle')}</h2>
                        <p className="text-sm text-slate-500">{t('extendViewDesc')}</p>
                    </div>
                </div>
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100">
                    <Icon name="arrow-uturn-left" className="w-5 h-5" />
                    <span>{t('backToUtilities')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-6">
                    <section>
                        <h3 className="font-semibold text-slate-800 mb-3">{t('uploadImageToExtend')}</h3>
                        {sourceImage ? (
                          <div className='space-y-3'>
                              <ImageDropzone onImageUpload={setSourceImage} className="cursor-pointer rounded-lg">
                                <div className='bg-slate-100 rounded-lg p-2 border border-slate-200'><img src={sourceImageToDataUrl(sourceImage)} alt="Source for extending" className="w-full h-auto object-contain rounded" /></div>
                              </ImageDropzone>
                              <button onClick={() => setSourceImage(null)} className='text-red-500 hover:text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-50'>{t('delete')}</button>
                          </div>
                        ) : (
                          <ImageDropzone onImageUpload={setSourceImage} className='w-full h-40 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-center text-slate-500 text-sm cursor-pointer transition-colors'>
                              <div><p>{t('dropzoneHint')}</p><p className="text-xs mt-1 text-slate-400">{t('dropzoneFormats')}</p></div>
                          </ImageDropzone>
                        )}
                    </section>
                    <section>
                        <h3 className="font-semibold text-slate-800 mb-2">{t('chooseAspectRatio')}</h3>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            {ASPECT_RATIO_OPTIONS.filter(r => r !== 'auto').map(ratio => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-2 px-2 text-center rounded-md border transition-colors ${aspectRatio === ratio ? 'bg-orange-600 text-white font-semibold border-orange-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'}`}>{ASPECT_RATIO_LABELS[ratio]}</button>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h3 className="font-semibold text-slate-800 mb-2">{t('imageCount')}</h3>
                        <div className="flex items-center justify-between bg-slate-50 rounded-md p-2 border border-slate-300">
                            <button onClick={() => setImageCount(Math.max(1, imageCount - 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">-</button>
                            <span className="text-lg font-semibold text-slate-900">{imageCount}</span>
                            <button onClick={() => setImageCount(Math.min(4, imageCount + 1))} className="px-4 py-2 rounded text-xl font-bold hover:bg-slate-200 text-slate-700">+</button>
                        </div>
                    </section>
                    <button onClick={handleGenerate} disabled={isLoading || !sourceImage} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed text-base shadow-sm">
                        <Icon name="sparkles" className="w-5 h-5" />
                        {isLoading ? t('generating') : t('generateExtendedView')}
                    </button>
                </div>
                <div className="lg:col-span-8 bg-slate-50 rounded-lg min-h-[60vh] flex items-center justify-center p-4 border border-slate-200">
                    {isLoading ? (
                        <div className="text-center text-slate-500">
                            <Icon name="sparkles" className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
                            <p>{t('generatingExtendedView')}...</p>
                        </div>
                    ) : generatedImages.length > 0 && selectedImage ? (
                       <div className="flex flex-col h-full w-full">
                            <div className="flex-grow flex items-center justify-center relative group bg-white rounded-lg overflow-hidden border border-slate-200">
                                <img src={selectedImage} alt="Selected Extended View" className="max-w-full max-h-[65vh] object-contain" />
                                <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button onClick={() => selectedImage && setFullscreenImage(selectedImage)} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-sm" title={t('fullscreen')}>
                                        <Icon name="arrows-pointing-out" className="w-5 h-5" />
                                    </button>
                                    <a href={selectedImage} download={`annconceptai-extended-${Date.now()}.png`} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2.5 rounded-full inline-flex shadow-sm" title={t('downloadImage')}>
                                        <Icon name="download" className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                            {generatedImages.length > 1 && (
                                <div className={`flex-shrink-0 mt-4 grid grid-cols-${Math.min(generatedImages.length, 4)} gap-2`}>
                                    {generatedImages.map((image, index) => (
                                        <div key={index} className={`relative cursor-pointer rounded-md overflow-hidden transition-all duration-200 h-28 ${selectedImage === image ? 'ring-2 ring-orange-500' : 'opacity-70 hover:opacity-100 ring-1 ring-slate-200'}`} onClick={() => setSelectedImage(image)}>
                                            <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400">
                            <Icon name="arrows-pointing-out" className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-600">{t('extendViewEmptyHeader')}</h3>
                            <p className="mt-2">{t('extendViewEmptyText')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};