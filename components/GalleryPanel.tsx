import React from 'react';
import { Icon } from './icons';
import type { ActiveTab, SourceImage, ObjectTransform } from '../types';
import { ImageEditor } from './ImageEditor';
import { BrushEditor } from './BrushEditor';
import { AreaSelector } from './ArrowEditor';
import { InteractiveCanvas } from './InteractiveCanvas';
import { useLanguage } from '../contexts/LanguageContext';

interface GalleryPanelProps {
    isLoading: boolean;
    loadingMessage: string;
    imageCount: number;
    activeTab: ActiveTab;
    generatedVideoUrl: string | null;
    generatedImages: string[];
    generatedPrompts: string | null;
    selectedImage: string | null;
    lastUsedPrompt: string;
    sourceImage: SourceImage | null;
    sourceImage2: SourceImage | null;
    isSelectingArea: boolean;
    isEditingMask: boolean;
    editTool: 'lasso' | 'brush';
    brushSize: number;
    setSelectedImage: (image: string) => void;
    setMaskImage: (mask: SourceImage | null) => void;
    onAreaSelected: (annotatedImage: SourceImage | null) => void;
    setFullscreenImage: (url: string | null) => void;
    handleStartEditing: (imageOverride?: string) => void;
    handleSetAsSourceImage: (imageOverride?: string) => void;
    copyToClipboard: (text: string) => void;
    onGenerateFromPrompt: (prompt: string) => void;
    areaSelectorRef: React.RefObject<{ clear: () => void }>;
    lassoEditorRef: React.RefObject<{ clear: () => void }>;
    brushEditorRef: React.RefObject<{ clear: () => void }>;
    canvaObjects: SourceImage[];
    canvaObjectTransforms: ObjectTransform[];
    setCanvaObjectTransforms: React.Dispatch<React.SetStateAction<ObjectTransform[]>>;
    selectedCanvaObjectIndex: number | null;
    setSelectedCanvaObjectIndex: React.Dispatch<React.SetStateAction<number | null>>;
    isCanvaLayoutLocked: boolean;
}

const PromptDisplay: React.FC<{ 
    promptsText: string; 
    copyToClipboard: (text: string) => void; 
    onGenerateFromPrompt: (prompt: string) => void;
}> = ({ promptsText, copyToClipboard, onGenerateFromPrompt }) => {
    const { t } = useLanguage();
    const lines = promptsText.split('\n').filter(line => line.trim() !== '');

    return (
        <div className="space-y-2 text-slate-800 h-full p-2">
            {lines.map((line, index) => {
                const cleanLine = line.trim();
                const isHeader = /^\s*\d+️⃣/.test(cleanLine);

                if (isHeader) {
                    return (
                        <h4 key={index} className="text-lg font-semibold text-slate-900 pt-4 first:pt-0">
                            {cleanLine}
                        </h4>
                    );
                }
                return (
                    <div key={index} className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <p className="text-sm flex-grow">{cleanLine}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => onGenerateFromPrompt(cleanLine)} title={t('createFromThisPrompt')} className="text-slate-500 hover:text-orange-500 p-1.5 rounded-md hover:bg-slate-200">
                                <Icon name="camera" className="w-5 h-5"/>
                            </button>
                            <button onClick={() => copyToClipboard(cleanLine)} title={t('copyPrompt')} className="text-slate-500 hover:text-orange-500 p-1.5 rounded-md hover:bg-slate-200">
                                <Icon name="clipboard" className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const LoadingState: React.FC<{ isVideo: boolean, isPromptGen: boolean, message: string }> = ({ isVideo, isPromptGen, message }) => {
    const { t } = useLanguage();
    if (isPromptGen) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <Icon name="cpu-chip" className="w-16 h-16 mb-4 text-slate-400 animate-pulse" />
                <h3 className="text-xl font-semibold text-slate-700">{message || t('loadingPromptHeader')}</h3>
                <p className="mt-2 text-sm max-w-sm">{t('loadingPromptHelp')}</p>
            </div>
        );
    }
    if (isVideo) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <Icon name="video-camera" className="w-16 h-16 mb-4 text-slate-400 animate-pulse" />
                <h3 className="text-xl font-semibold text-slate-700">{message || t('loadingVideoHeader')}</h3>
                <p className="mt-2 text-sm max-w-sm">{t('loadingVideoHelp')}</p>
            </div>
        );
    }
    return (
        <div className="h-full flex flex-col items-center justify-center text-center">
            <Icon name="camera" className="w-16 h-16 mb-6 text-slate-400 animate-pulse" />
            <h3 className="text-xl font-semibold text-slate-700 mb-8">{message || t('loadingMessageDefault')}</h3>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm w-full max-w-lg text-left space-y-2">
                <p><strong className="font-semibold text-slate-800">{t('loadingUsageLimit')}</strong> {t('loadingUsageText')}</p>
                <p>{t('loadingUsageNote')}</p>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ activeTab: ActiveTab }> = ({ activeTab }) => {
    const { t } = useLanguage();
    let message = t('emptyStateHeader');
    let subMessage = t('emptyStateText');

    if (activeTab === 'canva') {
        message = t('emptyCanvaHeader');
        subMessage = t('emptyCanvaText');
    }

    if (activeTab === 'prompt') {
        message = t('emptyPromptHeader');
        subMessage = t('emptyPromptText');
    }

    return (
        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
            <Icon name={'sparkles'} className="w-16 h-16 mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-700">
                {message}
            </h3>
            <p className="mt-2">
                {subMessage}
            </p>
        </div>
    );
};

export const GalleryPanel: React.FC<GalleryPanelProps> = ({
    isLoading, loadingMessage, imageCount, activeTab, generatedVideoUrl, generatedImages, generatedPrompts, selectedImage, lastUsedPrompt, sourceImage, sourceImage2,
    isSelectingArea, isEditingMask, editTool, brushSize, setSelectedImage, setMaskImage, onAreaSelected, setFullscreenImage,
    handleStartEditing, handleSetAsSourceImage, copyToClipboard, onGenerateFromPrompt,
    areaSelectorRef, lassoEditorRef, brushEditorRef,
    canvaObjects, canvaObjectTransforms, setCanvaObjectTransforms, selectedCanvaObjectIndex, setSelectedCanvaObjectIndex, isCanvaLayoutLocked
}) => {
    const { t } = useLanguage();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);
    
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return <LoadingState isVideo={activeTab === 'video'} isPromptGen={activeTab === 'prompt'} message={loadingMessage} />;
        }

        if (activeTab === 'prompt' && generatedPrompts) {
            return <PromptDisplay promptsText={generatedPrompts} copyToClipboard={copyToClipboard} onGenerateFromPrompt={onGenerateFromPrompt} />;
        }

        // Handle Canva's state BEFORE generation results are available
        if (activeTab === 'canva' && generatedImages.length === 0) {
            if (sourceImage) {
                return (
                    <InteractiveCanvas
                        bgImage={sourceImage}
                        canvaObjects={canvaObjects}
                        canvaObjectTransforms={canvaObjectTransforms}
                        setCanvaObjectTransforms={setCanvaObjectTransforms}
                        selectedCanvaObjectIndex={selectedCanvaObjectIndex}
                        setSelectedCanvaObjectIndex={setSelectedCanvaObjectIndex}
                        isCanvaLayoutLocked={isCanvaLayoutLocked}
                    />
                );
            }
            return <EmptyState activeTab={activeTab} />;
        }
        
        if (generatedVideoUrl) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-grow flex items-center justify-center relative group bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                        <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full max-h-[75vh] object-contain" />
                        <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <a href={generatedVideoUrl} download={`annconcept-video-${Date.now()}.mp4`} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2 rounded-md shadow-sm" title={t('downloadVideo')}>
                                <Icon name="download" className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                     <div className="my-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-sm text-slate-700 flex-grow">{lastUsedPrompt}</p>
                        <button onClick={() => copyToClipboard(lastUsedPrompt)} title={t('copyPrompt')} className="text-slate-500 hover:text-orange-500 flex-shrink-0">
                          <Icon name="clipboard" className="w-5 h-5"/>
                        </button>
                      </div>
                    </div>
                </div>
            );
        }
        
        if (generatedImages.length > 0) {
            // Logic to determine if we should show the Single View (Edit/Selection mode) or Grid View (Results mode)
            const showSingleView = isSelectingArea || isEditingMask || generatedImages.length <= 1;

            if (showSingleView && selectedImage) {
                return (
                    <div className="flex flex-col h-full">
                        <div className="flex-grow flex items-center justify-center relative group bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <img src={selectedImage} alt="Selected Render" className="max-w-full max-h-[65vh] object-contain" />
                            {activeTab === 'cameraAngle' && sourceImage && isSelectingArea && (
                                <AreaSelector ref={areaSelectorRef} sourceImage={sourceImage} onAreaSelected={onAreaSelected} />
                            )}
                            {!isMobile && activeTab === 'edit' && sourceImage && (
                                editTool === 'lasso' ? (isEditingMask && <ImageEditor ref={lassoEditorRef} sourceImage={sourceImage} onMaskReady={setMaskImage} strokeWidth={brushSize}/>)
                                : (<BrushEditor ref={brushEditorRef} sourceImage={sourceImage} onMaskReady={setMaskImage} brushSize={brushSize}/>)
                            )}
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button onClick={() => selectedImage && setFullscreenImage(selectedImage)} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-sm" title={t('fullscreen')}>
                                    <Icon name="arrows-pointing-out" className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleStartEditing()} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-sm" title={t('editThisImage')}>
                                    <Icon name="pencil-swoosh" className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleSetAsSourceImage()} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-sm" title={t('useAsSource')}>
                                    <Icon name="arrow-up-tray" className="w-5 h-5" />
                                </button>
                                <a href={selectedImage} download={`annconcept-${Date.now()}.png`} className="bg-white/80 backdrop-blur-sm border border-slate-300 hover:bg-white text-slate-800 p-2.5 rounded-full inline-flex shadow-sm" title={t('downloadImage')}>
                                    <Icon name="download" className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                        <div className="my-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                            <div className="flex justify-between items-start gap-3">
                                <p className="text-sm text-slate-700 flex-grow">{lastUsedPrompt || (activeTab === 'edit' && t('noPrompt'))}</p>
                                <button onClick={() => copyToClipboard(lastUsedPrompt)} title={t('copyPrompt')} className="text-slate-500 hover:text-orange-500 flex-shrink-0">
                                    <Icon name="clipboard" className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        {generatedImages.length > 1 && (
                            <div className={`flex-shrink-0 grid grid-cols-${Math.min(generatedImages.length, 4)} gap-2`}>
                                {generatedImages.map((image, index) => (
                                    <div key={index} className={`relative cursor-pointer rounded-md overflow-hidden transition-all duration-200 h-28 ${selectedImage === image ? 'ring-2 ring-orange-500' : 'opacity-70 hover:opacity-100 ring-1 ring-slate-200'}`} onClick={() => setSelectedImage(image)}>
                                        <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            } else {
                // Grid View for Results
                return (
                    <div className="flex flex-col h-full">
                         {lastUsedPrompt && (
                            <div className="flex-shrink-0 mb-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                                <div className="flex justify-between items-start gap-3">
                                    <p className="text-sm text-slate-700 flex-grow line-clamp-2">{lastUsedPrompt}</p>
                                    <button onClick={() => copyToClipboard(lastUsedPrompt)} title={t('copyPrompt')} className="text-slate-500 hover:text-orange-500 flex-shrink-0">
                                        <Icon name="clipboard" className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                            <div className="columns-2 md:columns-2 xl:columns-3 gap-4 space-y-4 pb-12">
                                {generatedImages.map((image, index) => (
                                    <div key={index} className="break-inside-avoid relative group rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-orange-500/50 shadow-sm transition-all">
                                        <img 
                                            src={image} 
                                            alt={`Result ${index + 1}`} 
                                            className="w-full h-auto object-cover block" 
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                            <div className="flex gap-2">
                                                <button onClick={() => setFullscreenImage(image)} className="bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white text-slate-800 p-2.5 rounded-full transition-transform hover:scale-110 shadow-lg" title={t('fullscreen')}>
                                                    <Icon name="arrows-pointing-out" className="w-5 h-5" />
                                                </button>
                                                <a href={image} download={`annconcept-${Date.now()}-${index}.png`} className="bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white text-slate-800 p-2.5 rounded-full inline-flex transition-transform hover:scale-110 shadow-lg" title={t('downloadImage')}>
                                                    <Icon name="download" className="w-5 h-5" />
                                                </a>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleStartEditing(image)} className="bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white text-slate-800 p-2.5 rounded-full transition-transform hover:scale-110 shadow-lg" title={t('editThisImage')}>
                                                    <Icon name="pencil-swoosh" className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleSetAsSourceImage(image)} className="bg-white/90 backdrop-blur-sm border border-slate-200 hover:bg-white text-slate-800 p-2.5 rounded-full transition-transform hover:scale-110 shadow-lg" title={t('useAsSource')}>
                                                    <Icon name="arrow-up-tray" className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }
        }
        return <EmptyState activeTab={activeTab} />;
    };
    
    return (
        <div className="lg:col-span-8 xl:col-span-9 bg-white p-4 rounded-xl shadow-lg border border-slate-200 min-h-[60vh] lg:min-h-0 h-[85vh] flex flex-col">
            {renderContent()}
        </div>
    );
};