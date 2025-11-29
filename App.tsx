
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { SourceImage, HistoryItem, ActiveTab, AspectRatio, EditSubMode, ObjectTransform, BoundingBox } from './types';
import { generateImages, editImage, generateVideo, mergeImages, generatePromptFromImage, placeAndRenderFurniture, generateArchitecturalPrompts, generatePromptFromPlan, generateMoodboard, applyLighting, generateVideoScriptPrompt, extendView, generateStyleChangePrompt, analyzeCharacterImage, analyzeImageArea } from './services/geminiService';
import { sourceImageToDataUrl, copyToClipboard, dataUrlToSourceImage, cropImage, compositeImage } from './utils';
import { useHistory } from './hooks/useHistory';
import { useLibrary } from './hooks/useLibrary';
import { useLanguage } from './contexts/LanguageContext';

import { Header } from './components/Header';
import { TopNavBar } from './components/TopNavBar';
import { ControlPanel } from './components/ControlPanel';
import { GalleryPanel } from './components/GalleryPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { FullscreenViewer } from './components/FullscreenViewer';
import { Icon } from './components/icons';
import { UtilitiesView } from './components/UtilitiesView';
import { EditorBetaView } from './components/EditorBetaView';
import { LibraryView } from './components/LibraryView';

export default function App() {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [sourceImage2, setSourceImage2] = useState<SourceImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<SourceImage | null>(null);
  const [editReferenceImage, setEditReferenceImage] = useState<SourceImage | null>(null);
  const [maskImage, setMaskImage] = useState<SourceImage | null>(null);
  const [prompt, setPrompt] = useState(t('promptInitial'));
  const [negativePrompt, setNegativePrompt] = useState(t('defaultNegativePrompt'));
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedPrompts, setGeneratedPrompts] = useState<string | null>(null);
  const [promptTabSourceImage, setPromptTabSourceImage] = useState<SourceImage | null>(null);
  const [characterImage, setCharacterImage] = useState<SourceImage | null>(null); // New state for character image
  const [lastUsedPrompt, setLastUsedPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { history, addHistoryItem, clearHistory } = useHistory();
  const { library, addImageToLibrary, removeImageFromLibrary, justSavedId } = useLibrary();
  const [isEditingMask, setIsEditingMask] = useState(false);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [planTo3dMode, setPlanTo3dMode] = useState<'render' | 'colorize'>('render');
  const [editSubMode, setEditSubMode] = useState<EditSubMode>('inpaint');
  const [editTool, setEditTool] = useState<'lasso' | 'brush'>('brush');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [videoModel] = useState('veo-2.0-generate-001');
  const [useProModel, setUseProModel] = useState(false);
  const [imageSize, setImageSize] = useState<string>('1K');

  // New state for Canva Mix
  const [canvaObjects, setCanvaObjects] = useState<SourceImage[]>([]);
  const [canvaObjectTransforms, setCanvaObjectTransforms] = useState<ObjectTransform[]>([]);
  const [selectedCanvaObjectIndex, setSelectedCanvaObjectIndex] = useState<number | null>(null);
  const [isCanvaLayoutLocked, setIsCanvaLayoutLocked] = useState(false);

  // New state for Virtual Tour
  const [virtualTourHistory, setVirtualTourHistory] = useState<string[]>([]);
  const [virtualTourIndex, setVirtualTourIndex] = useState(-1);

  // State for Utilities/Moodboard
  const [moodboardSourceImage, setMoodboardSourceImage] = useState<SourceImage | null>(null);
  const [moodboardReferenceImage, setMoodboardReferenceImage] = useState<SourceImage | null>(null);
  const [moodboardPrompt, setMoodboardPrompt] = useState('');
  const [moodboardImageCount, setMoodboardImageCount] = useState(2);
  const [moodboardGeneratedImages, setMoodboardGeneratedImages] = useState<string[]>([]);
  const [moodboardSelectedImage, setMoodboardSelectedImage] = useState<string | null>(null);

  // State for Utilities/Lighting
  const [lightingSourceImage, setLightingSourceImage] = useState<SourceImage | null>(null);
  const [lightingSelectedPrompts, setLightingSelectedPrompts] = useState<{interior: string; exterior: string}>({ interior: '', exterior: '' });
  const [lightingImageCount, setLightingImageCount] = useState(2);
  const [lightingGeneratedImages, setLightingGeneratedImages] = useState<string[]>([]);
  const [lightingSelectedImage, setLightingSelectedImage] = useState<string | null>(null);

  // State for Utilities/Video Prompt
  const [videoPromptSourceImage, setVideoPromptSourceImage] = useState<SourceImage | null>(null);
  const [videoPromptUserPrompt, setVideoPromptUserPrompt] = useState('');
  const [videoPromptGeneratedPrompt, setVideoPromptGeneratedPrompt] = useState<string | null>(null);

  // State for Utilities/Extend View
  const [extendViewSourceImage, setExtendViewSourceImage] = useState<SourceImage | null>(null);
  const [extendViewAspectRatio, setExtendViewAspectRatio] = useState<AspectRatio>('16:9');
  const [extendViewImageCount, setExtendViewImageCount] = useState(2);
  const [extendViewGeneratedImages, setExtendViewGeneratedImages] = useState<string[]>([]);
  const [extendViewSelectedImage, setExtendViewSelectedImage] = useState<string | null>(null);

  // State for Utilities/Change Style
  const [changeStyleSourceImage, setChangeStyleSourceImage] = useState<SourceImage | null>(null);
  const [changeStyleUserPrompt, setChangeStyleUserPrompt] = useState('');
  const [changeStyleGeneratedPrompt, setChangeStyleGeneratedPrompt] = useState<string | null>(null);
  const [changeStyleImageCount, setChangeStyleImageCount] = useState(2);
  const [changeStyleGeneratedImages, setChangeStyleGeneratedImages] = useState<string[]>([]);
  const [changeStyleSelectedImage, setChangeStyleSelectedImage] = useState<string | null>(null);

  // State for Utilities/Upscale Detail
  const [upscaleDetailSourceImage, setUpscaleDetailSourceImage] = useState<SourceImage | null>(null);
  const [upscaleDetailGeneratedImages, setUpscaleDetailGeneratedImages] = useState<string[]>([]);
  const [upscaleDetailSelectedImage, setUpscaleDetailSelectedImage] = useState<string | null>(null);

  // State for Editor Beta
  const [editorBetaSource, setEditorBetaSource] = useState<SourceImage | null>(null);
  const [editorBetaReference, setEditorBetaReference] = useState<SourceImage | null>(null);
  const [editorBetaSelection, setEditorBetaSelection] = useState<{ box: BoundingBox; mask: SourceImage } | null>(null);
  const [editorBetaPrompt, setEditorBetaPrompt] = useState('');
  const [editorBetaIntermediateResult, setEditorBetaIntermediateResult] = useState<SourceImage | null>(null);
  const [editorBetaFinalResult, setEditorBetaFinalResult] = useState<SourceImage | null>(null);
  const [editorBetaExpansion, setEditorBetaExpansion] = useState(10);
  const [editorBetaEdgeBlend, setEditorBetaEdgeBlend] = useState(10);


  const lassoEditorRef = useRef<{ clear: () => void }>(null);
  const brushEditorRef = useRef<{ clear: () => void }>(null);
  const areaSelectorRef = useRef<{ clear: () => void }>(null);
  
  // Ref to store the shared source image when switching to the isolated 'prompt' tab
  const sharedSourceImageRef = useRef<SourceImage | null>(null);
  // Ref to prevent default prompts from overwriting restored history state
  const isRestoringRef = useRef(false);


  useEffect(() => {
    if (generatedImages.length > 0 && !selectedImage) {
      setSelectedImage(generatedImages[0]);
    }
  }, [generatedImages, selectedImage]);
  
  useEffect(() => {
      if (activeTab !== 'edit' || !sourceImage) setIsEditingMask(false);
      if (activeTab !== 'cameraAngle' || !sourceImage) setIsSelectingArea(false);
  }, [activeTab, sourceImage]);

  useEffect(() => {
    if (activeTab === 'edit' && sourceImage && editTool === 'lasso') {
      setIsEditingMask(true);
    } else {
      setIsEditingMask(false);
    }
  }, [activeTab, sourceImage, editTool]);
  
  useEffect(() => {
    if (isRestoringRef.current) {
        isRestoringRef.current = false;
        return;
    }
    // This effect centralizes the logic for setting default prompts when the tab or language changes.
    if (activeTab === 'create') {
        setPrompt(t('promptInitial'));
        setNegativePrompt(t('defaultNegativePrompt'));
    } else if (['cameraAngle', 'edit', 'video', 'canva', 'prompt', 'utilities', 'editorBeta', 'library'].includes(activeTab)) {
        setPrompt('');
        setNegativePrompt('');
    } else if (activeTab === 'planTo3d') {
        setPrompt(t('promptPlanTo3d'));
        setNegativePrompt('');
        setPlanTo3dMode('render');
    }
  }, [activeTab, t]);


  const handleDeleteSelectedCanvaObject = useCallback(() => {
    if (selectedCanvaObjectIndex === null) return;
    
    setCanvaObjects(prev => prev.filter((_, i) => i !== selectedCanvaObjectIndex));
    setCanvaObjectTransforms(prev => prev.filter((_, i) => i !== selectedCanvaObjectIndex));
    setSelectedCanvaObjectIndex(null);

  }, [selectedCanvaObjectIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        // Only trigger if an object is selected in the canva tab and the key is Backspace
        if (activeTab === 'canva' && selectedCanvaObjectIndex !== null && event.key === 'Backspace') {
            event.preventDefault(); // Prevent browser from navigating back
            handleDeleteSelectedCanvaObject();
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, selectedCanvaObjectIndex, handleDeleteSelectedCanvaObject]);


  const handleSourceImageUpload = (image: SourceImage | null) => {
    if (!image) {
        // General reset for most tabs if image is cleared
        if(activeTab !== 'canva') setSourceImage(null);
        return;
    }

    // If in canva tab, a new background means we should clear old decor and any previous results.
    if (activeTab === 'canva') {
        setCanvaObjects([]);
        setCanvaObjectTransforms([]);
        setSelectedCanvaObjectIndex(null);
        setGeneratedImages([]); // Clear results to show the interactive canvas
        setSelectedImage(null);
    }

    setSourceImage(image);

    if (activeTab === 'planTo3d' && planTo3dMode === 'render') {
        (async () => {
            setPrompt(t('generating'));
            try {
                const newPrompt = await generatePromptFromPlan(image, language);
                setPrompt(newPrompt);
            } catch (error) {
                console.error("Failed to generate prompt from plan:", error);
                alert(t('alertGenerationFailed'));
                setPrompt(t('promptPlanTo3d'));
            }
        })();
    }

    if (activeTab === 'prompt') {
      setPromptTabSourceImage(image);
      setGeneratedPrompts(null);
    }
    
    setSourceImage2(null);
    setMaskImage(null);
    setEditReferenceImage(null);
    setIsSelectingArea(false);
    lassoEditorRef.current?.clear();
    brushEditorRef.current?.clear();
    areaSelectorRef.current?.clear();
    
    if (activeTab !== 'canva' && activeTab !== 'prompt') {
        const dataUrl = sourceImageToDataUrl(image);
        setGeneratedImages([dataUrl]);
        setSelectedImage(dataUrl);
    }
    setGeneratedVideoUrl(null);
  };
  
  const handleTabChange = (tab: ActiveTab) => {
      // Always reset UI states that are specific to a single tab to avoid weird carry-over.
      setIsSelectingArea(false);
      setEditTool('brush');
      setEditSubMode('inpaint');

      // --- State swapping for 'prompt' tab isolation ---
      if (tab === 'prompt') {
          // Switching TO the prompt tab
          // 1. Save the current shared sourceImage before we change it.
          sharedSourceImageRef.current = sourceImage;
          // 2. Set the control panel's source image to be the one for the prompt tab.
          setSourceImage(promptTabSourceImage);
          // Clear character image when entering prompt tab if necessary, or keep it
          // For now, we keep the promptTabSourceImage as is
      } else if (activeTab === 'prompt') {
          // Switching FROM the prompt tab
          // 1. Restore the shared sourceImage to the control panel.
          setSourceImage(sharedSourceImageRef.current);
      }
      
      // Reset the main source image if switching to utilities, as each utility manages its own.
      if (tab === 'utilities' || tab === 'editorBeta' || tab === 'library') {
          setSourceImage(null);
      }
  
      // Set the new active tab. This will trigger the useEffect for default prompts.
      setActiveTab(tab);
  };

  const handleToggleProMode = async () => {
    if (useProModel) {
      setUseProModel(false);
    } else {
      try {
        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
            // Assume success after dialog interaction, or we could re-check via hasSelectedApiKey()
            // but the prompt says to "assume the key selection was successful".
            setUseProModel(true);
        } else {
            console.warn("aistudio.openSelectKey not available");
            // For local dev where this might not exist, maybe we just enable it?
            // Or show an alert.
            // alert(t('alertApiKeyUtilUnavailable'));
            // For now, assume it's working in the target environment or fallback.
            setUseProModel(true); 
        }
      } catch (error) {
        console.error("Failed to select API key:", error);
        alert(t('alertInvalidApiKey'));
        setUseProModel(false);
      }
    }
  };

  const handleAreaSelectedAndGenerate = useCallback(async (areaImage: SourceImage | null) => {
    if (!sourceImage || !areaImage) return;

    setIsSelectingArea(false);
    setIsLoading(true);
    setGeneratedImages([]);
    setSelectedImage(null);
    setGeneratedVideoUrl(null);
    
    // Step 1: Analyze the selected area
    setLoadingMessage(t('loadingAnalyzingArea'));
    
    try {
        const analysisDescription = await analyzeImageArea(areaImage, language);
        
        // Step 2: Generate high-quality image based on the analysis
        setLoadingMessage(t('loadingStart'));
        
        // Combine the user's base intent (Close-up) with the AI's detailed analysis
        const finalPrompt = `Create a high-resolution architectural close-up based on this detailed description of the scene: "${analysisDescription}". Ensure photorealistic quality, correct lighting, and sharp textures.`;
        
        const finalUserPrompt = `Close-up based on AI analysis: ${analysisDescription.substring(0, 50)}...`;
        setLastUsedPrompt(finalUserPrompt);

        const images = await generateImages(areaImage, finalPrompt, imageCount, null, '4:3', language, undefined, useProModel, imageSize);

        if (images.length > 0) {
            setGeneratedImages(images);
            images.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: activeTab,
                sourceImage,
                sourceImage2: null,
                referenceImage: null,
                prompt: finalUserPrompt,
                negativePrompt: '',
                imageCount,
                generatedImages: images,
                generatedPrompts: null,
            });
        }
    } catch (error) {
        console.error("Generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [sourceImage, imageCount, activeTab, addHistoryItem, t, language, addImageToLibrary, useProModel, imageSize]);

  // Handler for Upscale Detail Utility
  const handleUpscaleDetailGeneration = useCallback(async (croppedImage: SourceImage | null) => {
    if (!upscaleDetailSourceImage || !croppedImage) return;

    setIsLoading(true);
    setLoadingMessage(t('generatingUpscale'));
    setUpscaleDetailGeneratedImages([]);
    setUpscaleDetailSelectedImage(null);

    try {
        // Step 1: Analyze the specific cropped detail
        const analysisDescription = await analyzeImageArea(croppedImage, language);

        // Step 2: Generate high-res detail
        const finalPrompt = `Create a hyper-realistic, high-resolution close-up detail shot based on this description: "${analysisDescription}". Focus on texture, lighting, and material quality.`;
        
        const images = await generateImages(croppedImage, finalPrompt, 1, null, '1:1', language, undefined, useProModel, '1K'); // Use '1:1' and force pro settings if possible

        if (images.length > 0) {
            setUpscaleDetailGeneratedImages(images);
            setUpscaleDetailSelectedImage(images[0]);
            images.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: 'utilities',
                sourceImage: upscaleDetailSourceImage,
                sourceImage2: null,
                referenceImage: null,
                prompt: `Upscale Detail: ${analysisDescription.substring(0, 50)}...`,
                negativePrompt: '',
                imageCount: 1,
                generatedImages: images,
                generatedPrompts: null,
            });
        } else {
            alert(t('alertGenerationFailed'));
        }
    } catch (error) {
        console.error("Upscale detail generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [upscaleDetailSourceImage, language, addHistoryItem, t, addImageToLibrary, useProModel]);


  const handleGeneration = useCallback(async () => {
    if (!sourceImage && activeTab !== 'create' && activeTab !== 'prompt') return alert(t('alertUploadSource'));
    if (activeTab === 'edit') {
        if (editSubMode === 'inpaint' && !maskImage) return alert(t('alertDrawMask'));
        if (editSubMode !== 'inpaint' && !sourceImage2) return alert(t('alertUploadBothImages'));
    }
    if (activeTab === 'canva') {
        if (!sourceImage) return alert(t('alertUploadBg'));
        if (canvaObjects.length === 0) return alert(t('alertUploadDecor'));
    }
    if (!prompt && activeTab !== 'create' && activeTab === 'cameraAngle') return alert(t('alertEnterPrompt'));

    setIsLoading(true);
    setIsEditingMask(false);
    setIsSelectingArea(false);
    
    if (activeTab !== 'prompt') {
      setGeneratedImages([]);
      setSelectedImage(null);
    }

    setGeneratedVideoUrl(null);
    if (activeTab === 'prompt') {
      setGeneratedPrompts(null);
    }
    setLoadingMessage(t('loadingStart'));
    setLastUsedPrompt(prompt);


    try {
      if (activeTab === 'prompt' && sourceImage) {
        setLoadingMessage(t('loadingAnalyzePrompts'));
        setPromptTabSourceImage(sourceImage);
        
        // Check for character image and analyze if present
        let characterDescription = '';
        if (characterImage) {
            setLoadingMessage("Analyzing character...");
            characterDescription = await analyzeCharacterImage(characterImage, language);
            setLoadingMessage(t('loadingAnalyzePrompts'));
        }

        const prompts = await generateArchitecturalPrompts(sourceImage, language, characterDescription);
        setGeneratedPrompts(prompts);
        await addHistoryItem({
          tab: 'prompt',
          sourceImage,
          sourceImage2: characterImage || null, // Store character image as sourceImage2 in history for prompt tab
          referenceImage: null,
          prompt: t('promptArchitecturalGenerated') + (characterDescription ? ` (with character)` : ''),
          negativePrompt: '',
          imageCount: 0,
          generatedImages: [],
          generatedPrompts: prompts,
        });
      } else {
        let finalPrompt = prompt;
        let images: string[] = [];
  
        if (activeTab === 'canva' && sourceImage) {
            const placements = canvaObjects.map((obj, index) => ({
                image: obj,
                transform: canvaObjectTransforms[index],
            }));
            images = await placeAndRenderFurniture(sourceImage, placements, imageCount, language);
        } else if (activeTab === 'create') {
          const finalAspectRatio = aspectRatio === 'auto' ? '4:3' : aspectRatio;
          images = await generateImages(sourceImage, finalPrompt, imageCount, referenceImage, finalAspectRatio, language, negativePrompt, useProModel, imageSize);
        } else if (activeTab === 'cameraAngle' && sourceImage) {
          finalPrompt = `Render the building from the provided image with a new camera angle. The desired angle is: "${prompt}". The final image should be a realistic architectural photo.`;
          images = await generateImages(sourceImage, finalPrompt, imageCount, null, '4:3', language, undefined, useProModel, imageSize);
        } else if (activeTab === 'planTo3d' && sourceImage) {
          let engineeredPrompt = planTo3dMode === 'render' 
            ? `Bạn là một kiến trúc sư AI chuyên nghiệp, chuyên chuyển đổi các bản vẽ mặt bằng 2D thành các ảnh render nội thất 3D siêu thực. Người dùng đã cung cấp một hình ảnh mặt bằng 2D. **Nhiệm vụ của bạn**: 1. **Phân tích Bản vẽ**: Dựa vào hình ảnh mặt bằng, phân tích bố cục, kích thước phòng, vị trí đồ nội thất, cửa sổ và cửa ra vào. 2. **Áp dụng Phong cách**: Yêu cầu của người dùng là: "${prompt}". Mô tả này quyết định phong cách, không khí, vật liệu và thẩm mỹ tổng thể. 3. **Sử dụng Ảnh tham chiếu (nếu có)**: Nếu có ảnh thứ hai, đó là ảnh tham chiếu phong cách. Bạn PHẢI lấy cảm hứng từ ảnh này cho bảng màu, kết cấu vật liệu, và kiểu chiếu sáng. KHÔNG sao chép bố cục từ ảnh tham chiếu, chỉ sử dụng cho thẩm mỹ. Hãy chọn một góc nhìn ngang tầm mắt (eye-level) thú vị và hấp dẫn để thể hiện không gian một cách tốt nhất. Đầu ra cuối cùng phải là một ảnh render nội thất 3D chất lượng cao, tuân thủ chính xác các yêu cầu.`
            : `Bạn là một trợ lý AI cho kiến trúc sư. Nhiệm vụ của bạn là tô màu cho một bản vẽ mặt bằng 2D đen trắng. Người dùng đã cung cấp một hình ảnh mặt bằng. Yêu cầu của người dùng là: "${prompt}". Mô tả này chỉ định bảng màu, phong cách, và các yêu cầu cụ thể cho việc tô màu. Hãy sử dụng các tiêu chuẩn tô màu kiến trúc chuyên nghiệp và rõ ràng. Ví dụ, sử dụng các màu khác nhau cho tường, đồ nội thất, cửa sổ, cửa ra vào, và các loại phòng khác nhau. Kết quả đầu ra phải là một hình ảnh mặt bằng 2D đã được tô màu chất lượng cao. Không thay đổi bố cục hoặc thêm hiệu ứng 3D.`;
          images = await generateImages(sourceImage, engineeredPrompt, imageCount, planTo3dMode === 'render' ? referenceImage : null, '4:3', language, undefined, useProModel, imageSize);
        } else if (activeTab === 'edit' && sourceImage) {
          if (editSubMode === 'inpaint' && maskImage) {
              images = await editImage(sourceImage, maskImage, finalPrompt, imageCount, editReferenceImage, language);
          } else if (editSubMode !== 'inpaint' && sourceImage2) {
              images = await mergeImages(sourceImage, sourceImage2, finalPrompt, imageCount);
          }
        } else if (activeTab === 'video' && sourceImage) {
          const videoUrl = await generateVideo(sourceImage, finalPrompt, videoModel, setLoadingMessage);
          setGeneratedVideoUrl(videoUrl);
          if (videoUrl) {
            await addHistoryItem({
              tab: activeTab,
              sourceImage,
              sourceImage2: null,
              referenceImage: null,
              prompt: finalPrompt,
              negativePrompt: '',
              imageCount: 0,
              generatedImages: [],
              generatedPrompts: null,
              videoModel: videoModel,
            });
          }
        }
  
        if (images.length > 0) {
          const historyPrompt = activeTab === 'canva' ? t('promptCanvaMix') : prompt;
          await addHistoryItem({ tab: activeTab, sourceImage, sourceImage2: (activeTab === 'edit' && editSubMode !== 'inpaint') ? sourceImage2 : null, referenceImage: (activeTab === 'create' || (activeTab === 'planTo3d' && planTo3dMode === 'render')) ? referenceImage : activeTab === 'edit' ? editReferenceImage : null, prompt: historyPrompt, negativePrompt: activeTab === 'create' ? negativePrompt : '', imageCount, generatedImages: images, generatedPrompts: null });
          setGeneratedImages(images);
          images.forEach(img => addImageToLibrary(img));
        }
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      alert(t('alertGenerationFailed'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [sourceImage, sourceImage2, referenceImage, editReferenceImage, maskImage, prompt, negativePrompt, imageCount, aspectRatio, activeTab, planTo3dMode, editSubMode, addHistoryItem, canvaObjects, canvaObjectTransforms, videoModel, t, language, addImageToLibrary, characterImage, useProModel, imageSize]);

  const handleMoodboardGeneration = useCallback(async () => {
    if (!moodboardSourceImage || !moodboardPrompt) {
        alert(t('alertMoodboard'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generatingMoodboard'));
    setMoodboardGeneratedImages([]);
    setMoodboardSelectedImage(null);
    try {
        const result = await generateMoodboard(moodboardSourceImage, moodboardPrompt, moodboardReferenceImage, moodboardImageCount, language);
        if (result.length > 0) {
            setMoodboardGeneratedImages(result);
            result.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: 'utilities',
                sourceImage: moodboardSourceImage,
                sourceImage2: null,
                referenceImage: moodboardReferenceImage,
                prompt: moodboardPrompt,
                negativePrompt: '',
                imageCount: moodboardImageCount,
                generatedImages: result,
                generatedPrompts: null,
            });
        } else {
            alert(t('alertGenerationFailed'));
        }
    } catch (error) {
        console.error("Moodboard generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [moodboardSourceImage, moodboardPrompt, moodboardReferenceImage, moodboardImageCount, language, addHistoryItem, t, addImageToLibrary]);

  const handleLightingGeneration = useCallback(async () => {
    if (!lightingSourceImage || (!lightingSelectedPrompts.interior && !lightingSelectedPrompts.exterior)) {
        alert(t('alertLighting'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generatingLighting'));
    setLightingGeneratedImages([]);
    setLightingSelectedImage(null);
    try {
        const combinedPrompt = [lightingSelectedPrompts.interior, lightingSelectedPrompts.exterior].filter(Boolean).join(', ');
        const result = await applyLighting(lightingSourceImage, combinedPrompt, lightingImageCount, language);
        if (result.length > 0) {
            setLightingGeneratedImages(result);
            result.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: 'utilities',
                sourceImage: lightingSourceImage,
                sourceImage2: null,
                referenceImage: null,
                prompt: `Lighting: ${combinedPrompt}`,
                negativePrompt: '',
                imageCount: lightingImageCount,
                generatedImages: result,
                generatedPrompts: null,
            });
        } else {
            alert(t('alertGenerationFailed'));
        }
    } catch (error) {
        console.error("Lighting generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [lightingSourceImage, lightingSelectedPrompts, lightingImageCount, language, addHistoryItem, t, addImageToLibrary]);

  const handleVideoPromptGeneration = useCallback(async () => {
    if (!videoPromptSourceImage || !videoPromptUserPrompt) {
        alert(t('alertVideoPrompt'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generatingVideoPrompt'));
    setVideoPromptGeneratedPrompt(null);
    try {
        const result = await generateVideoScriptPrompt(videoPromptSourceImage, videoPromptUserPrompt, language);
        setVideoPromptGeneratedPrompt(result);
        await addHistoryItem({
            tab: 'utilities',
            sourceImage: videoPromptSourceImage,
            sourceImage2: null,
            referenceImage: null,
            prompt: `Video Script Request: ${videoPromptUserPrompt}`,
            negativePrompt: '',
            imageCount: 0,
            generatedImages: [],
            generatedPrompts: result,
        });
    } catch (error) {
        console.error("Video script generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [videoPromptSourceImage, videoPromptUserPrompt, language, addHistoryItem, t]);

  const handleExtendViewGeneration = useCallback(async () => {
    if (!extendViewSourceImage) {
        alert(t('alertUploadSource'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generatingExtendedView'));
    setExtendViewGeneratedImages([]);
    setExtendViewSelectedImage(null);
    try {
        const result = await extendView(extendViewSourceImage, extendViewAspectRatio, extendViewImageCount, language);
        if (result.length > 0) {
            setExtendViewGeneratedImages(result);
            result.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: 'utilities',
                sourceImage: extendViewSourceImage,
                sourceImage2: null,
                referenceImage: null,
                prompt: `Extend View to ${extendViewAspectRatio}`,
                negativePrompt: '',
                imageCount: extendViewImageCount,
                generatedImages: result,
                generatedPrompts: null,
            });
        } else {
            alert(t('alertGenerationFailed'));
        }
    } catch (error) {
        console.error("Extend view generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [extendViewSourceImage, extendViewAspectRatio, extendViewImageCount, language, addHistoryItem, t, addImageToLibrary]);

  const handleStylePromptGeneration = useCallback(async () => {
    if (!changeStyleSourceImage || !changeStyleUserPrompt) {
        alert(t('alertStylePromptGen'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generatingStylePrompt'));
    try {
        const result = await generateStyleChangePrompt(changeStyleSourceImage, changeStyleUserPrompt, language);
        setChangeStyleGeneratedPrompt(result);
    } catch (error) {
        console.error("Style prompt generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [changeStyleSourceImage, changeStyleUserPrompt, language, t]);

  const handleStyleImageGeneration = useCallback(async () => {
    if (!changeStyleSourceImage || !changeStyleGeneratedPrompt) {
        alert(t('alertStyleChange'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generatingStyledImages'));
    setChangeStyleGeneratedImages([]);
    setChangeStyleSelectedImage(null);

    try {
        const images = await generateImages(changeStyleSourceImage, changeStyleGeneratedPrompt, changeStyleImageCount, null, '4:3', language, undefined, useProModel, imageSize);

        if (images.length > 0) {
            setChangeStyleGeneratedImages(images);
            images.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: 'utilities',
                sourceImage: changeStyleSourceImage,
                sourceImage2: null,
                referenceImage: null,
                prompt: `Change Style: ${changeStyleGeneratedPrompt}`,
                negativePrompt: '',
                imageCount: changeStyleImageCount,
                generatedImages: images,
                generatedPrompts: null,
            });
        } else {
            alert(t('alertGenerationFailed'));
        }
    } catch (error) {
        console.error("Change style image generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [changeStyleSourceImage, changeStyleGeneratedPrompt, changeStyleImageCount, language, addHistoryItem, t, addImageToLibrary, useProModel, imageSize]);

  const handleEditorBetaGeneration = useCallback(async () => {
    if (!editorBetaSource || !editorBetaSelection || !editorBetaPrompt) {
        alert(t('alertSelectArea'));
        return;
    }
    setIsLoading(true);
    setLoadingMessage(t('generating'));
    setEditorBetaIntermediateResult(null);
    setEditorBetaFinalResult(null);

    try {
        // Step 1: Crop the source image and mask
        const croppedSource = await cropImage(editorBetaSource, editorBetaSelection.box);
        const croppedMask = await cropImage(editorBetaSelection.mask, editorBetaSelection.box);
        
        // Step 2: Call Gemini
        // Pass editorBetaReference to the editImage function
        const results = await editImage(croppedSource, croppedMask, editorBetaPrompt, 1, editorBetaReference, language);
        
        if (results.length > 0) {
            const generatedContent = dataUrlToSourceImage(results[0]);
            if (generatedContent) {
                setEditorBetaIntermediateResult(generatedContent);

                // Step 3: Composite the result back
                const finalImage = await compositeImage(
                    editorBetaSource,
                    generatedContent,
                    editorBetaSelection.box,
                    editorBetaSelection.mask,
                    { expansion: editorBetaExpansion, edgeBlend: editorBetaEdgeBlend }
                );
                setEditorBetaFinalResult(finalImage);
                addImageToLibrary(sourceImageToDataUrl(finalImage));
            }
        } else {
            alert(t('alertImageGenFailed'));
        }

    } catch (error) {
        console.error("Editor Beta generation failed:", error);
        alert(t('alertGenerationFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [editorBetaSource, editorBetaSelection, editorBetaPrompt, editorBetaExpansion, editorBetaEdgeBlend, language, t, addImageToLibrary, editorBetaReference]);

  const handleSetFinalAsSource = useCallback(() => {
    if (editorBetaFinalResult) {
      setEditorBetaSource(editorBetaFinalResult);
      // Reset the rest of the editor state for a new operation on the new source
      setEditorBetaReference(null); // Reset reference for new operation
      setEditorBetaIntermediateResult(null);
      setEditorBetaFinalResult(null);
      setEditorBetaSelection(null);
      setEditorBetaPrompt('');
    }
  }, [editorBetaFinalResult]);

  const handleSetEditorBetaSource = (image: SourceImage | null) => {
    setEditorBetaSource(image);
    setEditorBetaReference(null); // Reset reference when source changes
    setEditorBetaSelection(null);
    setEditorBetaIntermediateResult(null);
    setEditorBetaFinalResult(null);
    setEditorBetaPrompt('');
  };

  const handleGenerateFromPromptTab = useCallback(async (selectedPrompt: string) => {
    if (!promptTabSourceImage) {
        alert(t('alertNoSourceForPrompt'));
        return;
    }

    setIsLoading(true);
    setLoadingMessage(t('loadingStart'));
    setActiveTab('create');
    setGeneratedImages([]);
    setSelectedImage(null);
    setGeneratedVideoUrl(null);
    setLastUsedPrompt(selectedPrompt);
    setPrompt(selectedPrompt);
    setSourceImage(promptTabSourceImage);
    setNegativePrompt(''); // Reset negative prompt when generating this way
    setReferenceImage(null); // Clear reference when generating from prompt tab

    try {
        const images = await generateImages(promptTabSourceImage, selectedPrompt, imageCount, null, '4:3', language, undefined, useProModel, imageSize);

        if (images.length > 0) {
            setGeneratedImages(images);
            images.forEach(img => addImageToLibrary(img));
            await addHistoryItem({
                tab: 'create',
                sourceImage: promptTabSourceImage,
                sourceImage2: null,
                referenceImage: null,
                prompt: selectedPrompt,
                negativePrompt: '',
                imageCount,
                generatedImages: images,
                generatedPrompts: null,
            });
        } else {
            throw new Error(t('alertImageGenFailed'));
        }
    } catch (error) {
        console.error("Generation from prompt tab failed:", error);
        alert(t('alertImageGenFailedRetry'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [promptTabSourceImage, imageCount, addHistoryItem, t, language, addImageToLibrary, useProModel, imageSize]);
  
  const handleVirtualTourImageUpload = (image: SourceImage | null) => {
    if (image) {
        const dataUrl = sourceImageToDataUrl(image);
        setSourceImage(image); // Set the source image for the utility's control panel
        setVirtualTourHistory([dataUrl]);
        setVirtualTourIndex(0);
    } else {
        // This handles the reset from the "Xóa" button
        setSourceImage(null);
        setVirtualTourHistory([]);
        setVirtualTourIndex(-1);
    }
  };

  const handleVirtualTourNavigation = useCallback(async (navigationPrompt: string) => {
    if (virtualTourIndex < 0 || !virtualTourHistory[virtualTourIndex]) return;

    setIsLoading(true);
    setLoadingMessage("AI is generating the next frame...");

    try {
        const currentImage = dataUrlToSourceImage(virtualTourHistory[virtualTourIndex]);
        if (!currentImage) throw new Error("Could not find image to continue tour.");

        const images = await generateImages(currentImage, navigationPrompt, 1, null, '4:3', language, undefined, useProModel, imageSize);
        if (images.length > 0) {
            const newHistory = virtualTourHistory.slice(0, virtualTourIndex + 1);
            const updatedHistory = [...newHistory, images[0]];
            setVirtualTourHistory(updatedHistory);
            setVirtualTourIndex(updatedHistory.length - 1);
            addImageToLibrary(images[0]);
        } else {
            throw new Error(t('alertImageGenFailed'));
        }

    } catch (error) {
        console.error("Virtual tour generation failed:", error);
        alert(t('alertTourFailed'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [virtualTourHistory, virtualTourIndex, t, language, addImageToLibrary, useProModel, imageSize]);

  const handleVirtualTourHistorySelect = (index: number) => {
    if (index >= 0 && index < virtualTourHistory.length) {
        setVirtualTourIndex(index);
    }
  };

  const handleUndo = () => {
      if (virtualTourIndex > 0) {
          setVirtualTourIndex(prev => prev - 1);
      }
  };

  const handleRedo = () => {
      if (virtualTourIndex < virtualTourHistory.length - 1) {
          setVirtualTourIndex(prev => prev - 1);
      }
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    isRestoringRef.current = true;
    
    // Check for history item from prompt tab to restore sourceImage2 (which stores character image)
    if (item.tab === 'prompt') {
        // sourceImage2 in prompt tab history is the character image
        setCharacterImage(item.sourceImage2 || null);
        setPromptTabSourceImage(item.sourceImage);
    }

    // Check if the item is from a utility and switch to the utilities tab
    if (item.tab === 'utilities') {
      setActiveTab('utilities');
    } else {
      setActiveTab(item.tab);
    }

    setSourceImage(item.sourceImage);
    setSourceImage2(item.sourceImage2 || null);
    setEditReferenceImage(item.tab === 'edit' ? item.referenceImage : null);
    setReferenceImage(item.tab !== 'edit' ? item.referenceImage : null);
    setPrompt(item.prompt);
    setLastUsedPrompt(item.prompt);
    setNegativePrompt(item.negativePrompt || '');
    setImageCount(item.imageCount);
    setGeneratedImages(item.generatedImages);
    setSelectedImage(item.generatedImages[0] || null);
    setGeneratedVideoUrl(null);
    
    if (item.tab === 'utilities') {
        // This part needs to differentiate between different utilities
        if (item.prompt.startsWith('Lighting:')) {
            setLightingSourceImage(item.sourceImage);
            setLightingGeneratedImages(item.generatedImages);
            setLightingSelectedImage(item.generatedImages[0] || null);
        } else if (item.prompt.startsWith('Video Script Request:')) {
            setVideoPromptSourceImage(item.sourceImage);
            setVideoPromptUserPrompt(item.prompt.replace('Video Script Request: ', ''));
            setVideoPromptGeneratedPrompt(item.generatedPrompts || null);
        } else if (item.prompt.startsWith('Extend View to')) {
            setExtendViewSourceImage(item.sourceImage);
            const ratio = item.prompt.replace('Extend View to ', '') as AspectRatio;
            setExtendViewAspectRatio(ratio);
            setExtendViewImageCount(item.imageCount);
            setExtendViewGeneratedImages(item.generatedImages);
            setExtendViewSelectedImage(item.generatedImages[0] || null);
        } else if (item.prompt.startsWith('Change Style:')) {
            setChangeStyleSourceImage(item.sourceImage);
            const originalPrompt = item.prompt.replace('Change Style: ', '');
            setChangeStyleGeneratedPrompt(originalPrompt);
            setChangeStyleUserPrompt(''); 
            setChangeStyleImageCount(item.imageCount);
            setChangeStyleGeneratedImages(item.generatedImages);
            setChangeStyleSelectedImage(item.generatedImages[0] || null);
        } else if (item.prompt.startsWith('Upscale Detail:')) {
            setUpscaleDetailSourceImage(item.sourceImage);
            setUpscaleDetailGeneratedImages(item.generatedImages);
            setUpscaleDetailSelectedImage(item.generatedImages[0] || null);
        } else {
            setMoodboardSourceImage(item.sourceImage);
            setMoodboardReferenceImage(item.referenceImage);
            setMoodboardPrompt(item.prompt);
            setMoodboardImageCount(item.imageCount);
            setMoodboardGeneratedImages(item.generatedImages);
            setMoodboardSelectedImage(item.generatedImages[0] || null);
        }
    } else {
        setMoodboardSourceImage(null);
        setMoodboardReferenceImage(null);
        setMoodboardPrompt('');
        setMoodboardImageCount(2);
        setMoodboardGeneratedImages([]);
        setMoodboardSelectedImage(null);
        setVideoPromptSourceImage(null);
        setVideoPromptUserPrompt('');
        setVideoPromptGeneratedPrompt(null);
        setExtendViewSourceImage(null);
        setExtendViewGeneratedImages([]);
        setExtendViewSelectedImage(null);
        setChangeStyleSourceImage(null);
        setChangeStyleUserPrompt('');
        setChangeStyleGeneratedPrompt(null);
        setChangeStyleImageCount(2);
        setChangeStyleGeneratedImages([]);
        setChangeStyleSelectedImage(null);
        setUpscaleDetailSourceImage(null);
        setUpscaleDetailGeneratedImages([]);
        setUpscaleDetailSelectedImage(null);
    }
    
    if (item.tab === 'prompt' && item.generatedPrompts) {
      setGeneratedPrompts(item.generatedPrompts);
      // promptTabSourceImage already set above
    } else {
      setGeneratedPrompts(null);
      if (item.tab !== 'prompt') {
        setPromptTabSourceImage(null);
        setCharacterImage(null); // Clear character image when restoring non-prompt history
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSetAsSourceImage = (imageOverride?: string) => {
    const imgToUse = imageOverride || selectedImage;
    if (!imgToUse) return;
    const newSourceImage = dataUrlToSourceImage(imgToUse);
    if (newSourceImage) {
      setSourceImage(newSourceImage);
      setGeneratedImages([imgToUse]);
      setSelectedImage(imgToUse); // Keep image selected
      setNegativePrompt('');
      setReferenceImage(null);
      setEditReferenceImage(null);
      setGeneratedVideoUrl(null);
      setGeneratedPrompts(null);

      // Reset prompt based on the current tab, similar to new image upload
      if (activeTab === 'create') setPrompt(t('promptInitial'));
      else if (['cameraAngle', 'edit', 'video', 'canva', 'prompt', 'utilities'].includes(activeTab)) setPrompt('');
      else if (activeTab === 'planTo3d') setPrompt(t('promptPlanTo3d'));

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUseLibraryImage = (imageDataUrl: string) => {
    const newSourceImage = dataUrlToSourceImage(imageDataUrl);
    if (newSourceImage) {
      setActiveTab('create');
      setSourceImage(newSourceImage);
      setGeneratedImages([imageDataUrl]);
      setSelectedImage(imageDataUrl);
      setPrompt(t('promptInitial'));
      setNegativePrompt(t('defaultNegativePrompt'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUseEditorImageInCreate = (image: SourceImage) => {
    if (!image) return;
    
    // Switch to create tab
    setActiveTab('create');
    
    // Set the image as the new source
    setSourceImage(image);
    
    // Display the image in the gallery
    const dataUrl = sourceImageToDataUrl(image);
    setGeneratedImages([dataUrl]);
    setSelectedImage(dataUrl);
    
    // Reset relevant states for the 'create' tab
    setPrompt(t('promptInitial'));
    setNegativePrompt(t('defaultNegativePrompt'));
    setReferenceImage(null);
    setSourceImage2(null);
    setMaskImage(null);
    setGeneratedVideoUrl(null);
    setGeneratedPrompts(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEditing = (imageOverride?: string) => {
    const imgToUse = imageOverride || selectedImage;
    if (!imgToUse) return;
    const newSourceForEditing = dataUrlToSourceImage(imgToUse);
    if(newSourceForEditing) {
      setActiveTab('edit');
      setEditTool('brush');
      setEditSubMode('inpaint');
      setSourceImage(newSourceForEditing);
      setGeneratedImages([imgToUse]);
      setSelectedImage(imgToUse);
      setGeneratedVideoUrl(null);
      setGeneratedPrompts(null);
      setReferenceImage(null);
      setEditReferenceImage(null);
      setMaskImage(null);
      setPrompt('');
      lassoEditorRef.current?.clear();
      brushEditorRef.current?.clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderMainContent = () => {
    if (activeTab === 'utilities') {
      return <UtilitiesView
          // General props
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          setFullscreenImage={setFullscreenImage}
          sourceImage={sourceImage}
          setSourceImage={setSourceImage}
          copyToClipboard={copyToClipboard}
          // Moodboard props
          moodboardSourceImage={moodboardSourceImage}
          setMoodboardSourceImage={setMoodboardSourceImage}
          moodboardReferenceImage={moodboardReferenceImage}
          setMoodboardReferenceImage={setMoodboardReferenceImage}
          moodboardPrompt={moodboardPrompt}
          setMoodboardPrompt={setMoodboardPrompt}
          moodboardImageCount={moodboardImageCount}
          setMoodboardImageCount={setMoodboardImageCount}
          moodboardGeneratedImages={moodboardGeneratedImages}
          moodboardSelectedImage={moodboardSelectedImage}
          setMoodboardSelectedImage={setMoodboardSelectedImage}
          handleMoodboardGeneration={handleMoodboardGeneration}
          // Lighting props
          lightingSourceImage={lightingSourceImage}
          setLightingSourceImage={setLightingSourceImage}
          lightingSelectedPrompts={lightingSelectedPrompts}
          setLightingSelectedPrompts={setLightingSelectedPrompts}
          lightingImageCount={lightingImageCount}
          setLightingImageCount={setLightingImageCount}
          lightingGeneratedImages={lightingGeneratedImages}
          lightingSelectedImage={lightingSelectedImage}
          setLightingSelectedImage={setLightingSelectedImage}
          handleLightingGeneration={handleLightingGeneration}
          // Virtual Tour props
          virtualTourHistory={virtualTourHistory}
          virtualTourIndex={virtualTourIndex}
          handleVirtualTourNavigation={handleVirtualTourNavigation}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          handleVirtualTourHistorySelect={handleVirtualTourHistorySelect}
          handleVirtualTourImageUpload={handleVirtualTourImageUpload}
          // Video Prompt props
          videoPromptSourceImage={videoPromptSourceImage}
          setVideoPromptSourceImage={setVideoPromptSourceImage}
          videoPromptUserPrompt={videoPromptUserPrompt}
          setVideoPromptUserPrompt={setVideoPromptUserPrompt}
          videoPromptGeneratedPrompt={videoPromptGeneratedPrompt}
          handleVideoPromptGeneration={handleVideoPromptGeneration}
          // Extend View props
          extendViewSourceImage={extendViewSourceImage}
          setExtendViewSourceImage={setExtendViewSourceImage}
          extendViewAspectRatio={extendViewAspectRatio}
          setExtendViewAspectRatio={setExtendViewAspectRatio}
          extendViewImageCount={extendViewImageCount}
          setExtendViewImageCount={setExtendViewImageCount}
          extendViewGeneratedImages={extendViewGeneratedImages}
          extendViewSelectedImage={extendViewSelectedImage}
          setExtendViewSelectedImage={setExtendViewSelectedImage}
          handleExtendViewGeneration={handleExtendViewGeneration}
          // Change Style props
          changeStyleSourceImage={changeStyleSourceImage}
          setChangeStyleSourceImage={setChangeStyleSourceImage}
          changeStyleUserPrompt={changeStyleUserPrompt}
          setChangeStyleUserPrompt={setChangeStyleUserPrompt}
          changeStyleGeneratedPrompt={changeStyleGeneratedPrompt}
          setChangeStyleGeneratedPrompt={setChangeStyleGeneratedPrompt}
          changeStyleImageCount={changeStyleImageCount}
          setChangeStyleImageCount={setChangeStyleImageCount}
          changeStyleGeneratedImages={changeStyleGeneratedImages}
          changeStyleSelectedImage={changeStyleSelectedImage}
          setChangeStyleSelectedImage={setChangeStyleSelectedImage}
          handleStylePromptGeneration={handleStylePromptGeneration}
          handleStyleImageGeneration={handleStyleImageGeneration}
          // Upscale Detail props
          upscaleDetailSourceImage={upscaleDetailSourceImage}
          setUpscaleDetailSourceImage={setUpscaleDetailSourceImage}
          upscaleDetailGeneratedImages={upscaleDetailGeneratedImages}
          upscaleDetailSelectedImage={upscaleDetailSelectedImage}
          setUpscaleDetailSelectedImage={setUpscaleDetailSelectedImage}
          handleUpscaleDetailGeneration={handleUpscaleDetailGeneration}
        />;
    }
    if (activeTab === 'editorBeta') {
        return <EditorBetaView
            sourceImage={editorBetaSource}
            setSourceImage={handleSetEditorBetaSource}
            referenceImage={editorBetaReference} // Pass reference image state
            setReferenceImage={setEditorBetaReference} // Pass reference image setter
            selection={editorBetaSelection}
            setSelection={setEditorBetaSelection}
            prompt={editorBetaPrompt}
            setPrompt={setEditorBetaPrompt}
            intermediateResult={editorBetaIntermediateResult}
            finalResult={editorBetaFinalResult}
            expansion={editorBetaExpansion}
            setExpansion={setEditorBetaExpansion}
            edgeBlend={editorBetaEdgeBlend}
            setEdgeBlend={setEditorBetaEdgeBlend}
            isLoading={isLoading}
            handleGenerate={handleEditorBetaGeneration}
            setFullscreenImage={setFullscreenImage}
            handleSetFinalAsSource={handleSetFinalAsSource}
            handleUseEditorImageInCreate={handleUseEditorImageInCreate}
        />;
    }
    if (activeTab === 'library') {
      return (
        <LibraryView
          images={library}
          onDelete={removeImageFromLibrary}
          onUseAsSource={handleUseLibraryImage}
          onFullscreen={setFullscreenImage}
          justSavedId={justSavedId}
        />
      );
    }
    return (
      <>
        <ControlPanel
          // State
          activeTab={activeTab}
          sourceImage={sourceImage}
          sourceImage2={sourceImage2}
          referenceImage={referenceImage}
          editReferenceImage={editReferenceImage}
          prompt={prompt}
          negativePrompt={negativePrompt}
          imageCount={imageCount}
          aspectRatio={aspectRatio}
          isSelectingArea={isSelectingArea}
          editTool={editTool}
          brushSize={brushSize}
          planTo3dMode={planTo3dMode}
          editSubMode={editSubMode}
          isLoading={isLoading}
          useProModel={useProModel}
          imageSize={imageSize}
          // Setters & Handlers
          setSourceImage={setSourceImage}
          setSourceImage2={setSourceImage2}
          setReferenceImage={setReferenceImage}
          setEditReferenceImage={setEditReferenceImage}
          setPrompt={setPrompt}
          setNegativePrompt={setNegativePrompt}
          setImageCount={setImageCount}
          setAspectRatio={setAspectRatio}
          setIsSelectingArea={setIsSelectingArea}
          setEditTool={setEditTool}
          setBrushSize={setBrushSize}
          setPlanTo3dMode={setPlanTo3dMode}
          setEditSubMode={setEditSubMode}
          handleToggleProMode={handleToggleProMode}
          setImageSize={setImageSize}
          // General Handlers
          handleSourceImageUpload={handleSourceImageUpload}
          areaSelectorRef={areaSelectorRef}
          lassoEditorRef={lassoEditorRef}
          brushEditorRef={brushEditorRef}
          setMaskImage={setMaskImage}
          handleGeneration={handleGeneration}
          // Canva props
          canvaObjects={canvaObjects}
          setCanvaObjects={setCanvaObjects}
          canvaObjectTransforms={canvaObjectTransforms}
          setCanvaObjectTransforms={setCanvaObjectTransforms}
          selectedCanvaObjectIndex={selectedCanvaObjectIndex}
          setSelectedCanvaObjectIndex={setSelectedCanvaObjectIndex}
          isCanvaLayoutLocked={isCanvaLayoutLocked}
          setIsCanvaLayoutLocked={setIsCanvaLayoutLocked}
          handleDeleteSelectedCanvaObject={handleDeleteSelectedCanvaObject}
          // Prompt Gen specific
          characterImage={characterImage}
          setCharacterImage={setCharacterImage}
        />

        <GalleryPanel
          // State
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          imageCount={imageCount}
          activeTab={activeTab}
          generatedVideoUrl={generatedVideoUrl}
          generatedImages={generatedImages}
          generatedPrompts={generatedPrompts}
          selectedImage={selectedImage}
          lastUsedPrompt={lastUsedPrompt}
          sourceImage={sourceImage}
          sourceImage2={sourceImage2}
          isSelectingArea={isSelectingArea}
          isEditingMask={isEditingMask}
          editTool={editTool}
          brushSize={brushSize}
          // Setters & Handlers
          setSelectedImage={setSelectedImage}
          setMaskImage={setMaskImage}
          onAreaSelected={handleAreaSelectedAndGenerate}
          setFullscreenImage={setFullscreenImage}
          handleStartEditing={handleStartEditing}
          handleSetAsSourceImage={handleSetAsSourceImage}
          copyToClipboard={copyToClipboard}
          onGenerateFromPrompt={handleGenerateFromPromptTab}
          // Refs
          areaSelectorRef={areaSelectorRef}
          lassoEditorRef={lassoEditorRef}
          brushEditorRef={brushEditorRef}
          // Canva props
          canvaObjects={canvaObjects}
          canvaObjectTransforms={canvaObjectTransforms}
          setCanvaObjectTransforms={setCanvaObjectTransforms}
          selectedCanvaObjectIndex={selectedCanvaObjectIndex}
          setSelectedCanvaObjectIndex={setSelectedCanvaObjectIndex}
          isCanvaLayoutLocked={isCanvaLayoutLocked}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <Header />
      <TopNavBar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1800px] mx-auto">
        {renderMainContent()}
      </main>
      
      <HistoryPanel
        history={history}
        onRestore={handleRestoreHistory}
        onClear={clearHistory}
      />

      {fullscreenImage && (
        <FullscreenViewer imageUrl={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}
    </div>
  );
}