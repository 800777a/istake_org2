
import React, { useState } from 'react';
import { EventData, EventPhoto, Registration } from '../types';
import { X, Image as ImageIcon, Upload, Heart, ThumbsUp, CheckCircle, Clock, Sparkles, Loader } from 'lucide-react';
import { addEventPhoto, likeEventPhoto } from '../services/sheetService';
import { analyzeImageContent } from '../services/aiService';
import Toast, { ToastType } from './Toast';

interface GalleryModalProps {
  event: EventData;
  onClose: () => void;
  currentUser?: Registration; // Add user context for upload
}

const GalleryModal: React.FC<GalleryModalProps> = ({ event, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [uploadCaption, setUploadCaption] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<ToastType>('success');
  
  // Filter photos
  const approvedPhotos = (event.photos || []).filter(p => p.status === 'approved');
  const myPhotos = currentUser 
    ? (event.photos || []).filter(p => p.uploader === currentUser.name)
    : [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          setPreviewImage(evt.target?.result as string);
          setUploadCaption(''); // Reset caption for new image
      };
      reader.readAsDataURL(file);
  };

  const handleGenerateCaption = async () => {
      if (!previewImage) return;
      setIsAnalyzing(true);
      try {
          const caption = await analyzeImageContent(previewImage);
          setUploadCaption(caption.trim());
      } catch (e) {
          setMsgType('error');
          setMsg('AI 分析失敗，請手動輸入');
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleConfirmUpload = () => {
      if (!previewImage || !currentUser) return;

      const newPhoto: EventPhoto = {
          id: `IMG-${Date.now()}`,
          url: previewImage,
          caption: uploadCaption || '成員上傳',
          timestamp: new Date().toISOString(),
          uploader: currentUser.name,
          status: 'pending',
          likes: 0
      };
      addEventPhoto(event.event_id, newPhoto);
      setPreviewImage(null);
      setUploadCaption('');
      setMsgType('success');
      setMsg('照片已上傳！待負責人審核後將會顯示在相簿中。');
      setActiveTab('my');
  };

  const handleLike = (photoId: string) => {
      likeEventPhoto(event.event_id, photoId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 animate-fade-in">
      <div className="bg-white w-[900px] max-w-full rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 text-white flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" /> 
                社群相簿 (Community Gallery)
            </h2>
            <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><X className="w-5 h-5"/></button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-100 p-2 flex justify-between items-center border-b shrink-0">
            <div className="flex space-x-2">
                <button 
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeTab === 'all' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                    所有照片
                </button>
                {currentUser && (
                    <button 
                        onClick={() => setActiveTab('my')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeTab === 'my' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        我的上傳
                    </button>
                )}
            </div>

            {currentUser && !previewImage && (
                <label className="cursor-pointer bg-green-600 text-white px-4 py-1.5 rounded-full hover:bg-green-700 text-sm font-bold flex items-center shadow-sm">
                    <Upload className="w-4 h-4 mr-2" /> 上傳照片
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
            )}
        </div>

        {/* Upload Preview Area */}
        {previewImage && (
            <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row gap-4 items-start shrink-0 animate-fade-in">
                <img src={previewImage} className="w-32 h-32 object-cover rounded-lg shadow border-2 border-white" />
                <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-gray-700 mb-1">照片說明</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="輸入說明..." 
                            value={uploadCaption}
                            onChange={e => setUploadCaption(e.target.value)}
                            className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button 
                            onClick={handleGenerateCaption}
                            disabled={isAnalyzing}
                            className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded font-bold text-sm hover:bg-indigo-200 flex items-center whitespace-nowrap disabled:opacity-50"
                            title="AI 自動產生說明"
                        >
                            {isAnalyzing ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                            AI 魔法
                        </button>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                        <button 
                            onClick={() => { setPreviewImage(null); setUploadCaption(''); }}
                            className="text-gray-500 text-sm px-3 py-1 hover:bg-gray-200 rounded"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleConfirmUpload}
                            className="bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold hover:bg-green-700 shadow-sm"
                        >
                            確認發布
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Photo Grid */}
        <div className="p-4 overflow-y-auto bg-gray-50 flex-1">
            {activeTab === 'all' ? (
                approvedPhotos.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>尚無照片，歡迎上傳分享！</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {approvedPhotos.map(photo => (
                            <div key={photo.id} className="group relative break-inside-avoid mb-4">
                                <div className="aspect-square overflow-hidden rounded-lg bg-gray-200 shadow-sm relative">
                                    <img 
                                        src={photo.url} 
                                        alt="Event" 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center">
                                        <Heart className="w-3 h-3 mr-1 fill-white" /> {photo.likes || 0}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs truncate">{photo.caption}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[10px] opacity-70">by {photo.uploader || 'Admin'}</span>
                                            <button 
                                                onClick={() => handleLike(photo.id)}
                                                className="hover:text-pink-400"
                                            >
                                                <ThumbsUp className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                // My Photos Tab
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {myPhotos.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-gray-400">您尚未上傳任何照片</div>
                    ) : (
                        myPhotos.map(photo => (
                            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border">
                                <img src={photo.url} className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    {photo.status === 'approved' ? (
                                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center shadow">
                                            <CheckCircle className="w-3 h-3 mr-1" /> 已核准
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center shadow animate-pulse">
                                            <Clock className="w-3 h-3 mr-1" /> 審核中
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
      </div>
      <Toast message={msg} type={msgType} onClose={() => setMsg(null)} />
    </div>
  );
};

export default GalleryModal;
