
import React, { useState } from 'react';
import type { Utility } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Icon } from './icons';
import { MoodboardCreator } from './MoodboardCreator';
import { LightingCreator } from './LightingCreator';
import { VirtualTourCreator } from './VirtualTourCreator';
import { VideoPromptCreator } from './VideoPromptCreator';
import { ExtendViewCreator } from './ExtendViewCreator';
import { ChangeStyleCreator } from './ChangeStyleCreator';
import { UpscaleDetailCreator } from './UpscaleDetailCreator';

interface UtilityToolPlaceholderProps {
    utility: Utility;
    onBack: () => void;
}

const UtilityToolPlaceholder: React.FC<UtilityToolPlaceholderProps> = ({ utility, onBack }) => {
    const { t } = useLanguage();
    const titles: Record<Utility, string> = {
        moodboard: t('moodboardTitle'),
        videoPrompt: t('videoPromptTitle'),
        lighting: t('lightingTitle'),
        virtualTour: t('virtualTourTitle'),
        extendView: t('extendViewTitle'),
        changeStyle: t('changeStyleTitle'),
        upscaleDetail: t('upscaleDetailTitle'),
    };
    return (
        <div className="bg-white p-5 rounded-xl min-h-[70vh] flex flex-col items-center justify-center text-center border border-slate-200 shadow-lg relative">
            <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors">
                <Icon name="arrow-uturn-left" className="w-5 h-5" />
                {t('backToUtilities')}
            </button>
            <Icon name="cpu-chip" className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-4xl font-bold mb-4 text-slate-800">{titles[utility]}</h2>
            <p className="text-2xl text-slate-500 bg-slate-100 px-4 py-2 rounded-lg">{t('comingSoon')}</p>
        </div>
    );
};

interface UtilityThumbnailProps {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
}

const UtilityThumbnail: React.FC<UtilityThumbnailProps> = ({ icon, title, description, onClick }) => (
    <div 
        onClick={onClick}
        className="bg-white p-6 rounded-xl border border-slate-200 hover:border-orange-500 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 shadow-sm"
    >
        <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Icon name={icon} className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
);

export const UtilitiesView: React.FC<any> = (props) => {
    const { t } = useLanguage();
    const [activeUtility, setActiveUtility] = useState<Utility | null>(null);

    const utilities: { id: Utility; icon: string; }[] = [
        { id: 'moodboard', icon: 'clipboard' },
        { id: 'upscaleDetail', icon: 'arrows-pointing-out' },
        { id: 'lighting', icon: 'sparkles' },
        { id: 'virtualTour', icon: 'globe' },
        { id: 'videoPrompt', icon: 'video-camera' },
        { id: 'extendView', icon: 'arrows-pointing-out' },
        { id: 'changeStyle', icon: 'cpu-chip' },
    ];

    if (activeUtility) {
        let utilityComponent;
        switch(activeUtility) {
            case 'moodboard':
                utilityComponent = <MoodboardCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            case 'lighting':
                utilityComponent = <LightingCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            case 'virtualTour':
                utilityComponent = <VirtualTourCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            case 'videoPrompt':
                utilityComponent = <VideoPromptCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            case 'extendView':
                utilityComponent = <ExtendViewCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            case 'changeStyle':
                utilityComponent = <ChangeStyleCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            case 'upscaleDetail':
                utilityComponent = <UpscaleDetailCreator onBack={() => setActiveUtility(null)} {...props} />;
                break;
            default:
                utilityComponent = <UtilityToolPlaceholder utility={activeUtility} onBack={() => setActiveUtility(null)} />;
                break;
        }
        return (
            <div className="lg:col-span-12">
                {utilityComponent}
            </div>
        );
    }

    return (
        <div className="lg:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {utilities.map(util => (
                    <UtilityThumbnail 
                        key={util.id}
                        icon={util.icon}
                        title={t(`${util.id}Title`)}
                        description={t(`${util.id}Desc`)}
                        onClick={() => setActiveUtility(util.id)}
                    />
                ))}
            </div>
        </div>
    );
};