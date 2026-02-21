import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { uploadMenuImage, generateMenuImage } from '@/lib/admin-api';
import TabBar from '@/components/ui/TabBar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner';

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  menuName?: string;
  menuDescription?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  value,
  onChange,
  menuName,
  menuDescription,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('url');
  const [aiPrompt, setAiPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { key: 'url', label: t('admin.image_tab_url') },
    { key: 'upload', label: t('admin.image_tab_upload') },
    { key: 'ai', label: t('admin.image_tab_ai') },
  ];

  const uploadMutation = useMutation({
    mutationFn: uploadMenuImage,
    onSuccess: (url) => onChange(url),
  });

  const generateMutation = useMutation({
    mutationFn: generateMenuImage,
    onSuccess: (url) => onChange(url),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    // Reset so the same file can be selected again
    e.target.value = '';
  };

  const defaultPrompt = menuName
    ? `Professional food photo of ${menuName}${menuDescription ? `, ${menuDescription}` : ''}, on a clean plate, warm lighting, top-down view`
    : '';

  const handleGenerate = () => {
    const prompt = aiPrompt.trim() || defaultPrompt.trim();
    if (!prompt) return;
    generateMutation.mutate(prompt);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-700">{t('admin.image_label')}</label>

      {/* Preview */}
      {value && (
        <div className="relative w-full max-w-[200px] aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={value}
            alt="Menu preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* URL Tab */}
      {activeTab === 'url' && (
        <input
          type="text"
          placeholder={t('admin.image_url_placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
        />
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? (
              <Spinner size="md" />
            ) : (
              <>
                <Icon name="cloud_upload" size={32} className="text-gray-400" />
                <span className="text-sm text-gray-500">{t('admin.click_to_upload')}</span>
                <span className="text-xs text-gray-400">{t('admin.upload_help')}</span>
              </>
            )}
          </button>
          {uploadMutation.isError && (
            <p className="text-xs text-red-500">
              {uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : t('admin.upload_failed')}
            </p>
          )}
        </div>
      )}

      {/* AI Generate Tab */}
      {activeTab === 'ai' && (
        <div className="flex flex-col gap-2">
          <textarea
            placeholder={t('admin.ai_prompt_placeholder')}
            value={aiPrompt || defaultPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none placeholder:text-gray-400"
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleGenerate}
            loading={generateMutation.isPending}
            disabled={!(aiPrompt.trim() || defaultPrompt.trim())}
            icon="auto_awesome"
          >
            {t('admin.generate_image')}
          </Button>
          {generateMutation.isPending && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Spinner size="sm" />
              <p className="text-sm text-blue-600">{t('admin.generating_image')}</p>
            </div>
          )}
          {generateMutation.isError && (
            <p className="text-xs text-red-500">
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : t('admin.generation_failed')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
