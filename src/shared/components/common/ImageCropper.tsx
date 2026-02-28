import React, { useState, useRef } from 'react';
import { uploadToGoogleDrive } from '@/modules/tms/services/googleDrive';
import Spinner from './Spinner';

interface Props {
  imageSrc: string;
  userId: string;
  onCancel: () => void;
  onCropComplete: (url: string) => Promise<void>; 
}

const ImageCropper: React.FC<Props> = ({ imageSrc, userId, onCancel, onCropComplete }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [displaySize, setDisplaySize] = useState<{width: number, height: number} | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);

  const VIEWPORT_SIZE = 280; 
  const OUTPUT_SIZE = 500;

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      const ratio = naturalWidth / naturalHeight;
      
      let width, height;
      
      if (ratio < 1) {
          width = VIEWPORT_SIZE;
          height = VIEWPORT_SIZE / ratio;
      } else {
          height = VIEWPORT_SIZE;
          width = VIEWPORT_SIZE * ratio;
      }
      
      setDisplaySize({ width, height });
      setImageLoaded(true);
  };

  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    if (isUploading) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent | React.TouchEvent) => {
    if (!isDragging || isUploading) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const processCrop = (): string | null => {
    if (!imgRef.current || !displaySize) return null;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const scaleRatio = OUTPUT_SIZE / VIEWPORT_SIZE;
      
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      
      ctx.translate(pan.x * scaleRatio, pan.y * scaleRatio);
      ctx.scale(zoom * scaleRatio, zoom * scaleRatio);
      
      ctx.drawImage(
        imgRef.current,
        -displaySize.width / 2,
        -displaySize.height / 2,
        displaySize.width,
        displaySize.height
      );

      return canvas.toDataURL('image/jpeg', 0.9);
    }
    return null;
  };

  const handleConfirmCrop = async () => {
    const base64Image = processCrop();
    if (base64Image) {
        setIsUploading(true);
        const filename = `avatar_${userId}_${Date.now()}.jpg`;
        const url = await uploadToGoogleDrive(filename, base64Image);
        
        if (url) {
            await onCropComplete(url);
        } else {
            alert('Tải ảnh lên không thành công. Vui lòng thử lại.');
        }
        setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-neutral-black/95 dark:bg-dark-bg/95 backdrop-blur-md flex flex-col animate-fade-in touch-none">
      
      <div className="flex-1 flex flex-col items-center justify-center relative w-full">
          
          <h2 className="text-neutral-white font-black text-xl absolute top-[15vh] pointer-events-none tracking-tight">Cắt Ảnh Đại Diện</h2>

          <div
            className="relative z-20"
            style={{
              width: VIEWPORT_SIZE,
              height: VIEWPORT_SIZE,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.1)'
            }}
          >
             <div 
                className="absolute inset-0 z-30 cursor-move"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
             ></div>

             <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-slate-900">
                <img 
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop"
                    onLoad={onImgLoad}
                    draggable={false}
                    className="max-w-none select-none"
                    style={{
                        width: displaySize ? displaySize.width : 'auto',
                        height: displaySize ? displaySize.height : 'auto',
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        opacity: imageLoaded ? 1 : 0,
                        transition: isDragging ? 'none' : 'opacity 0.2s',
                    }}
                />
             </div>
          </div>

          {isUploading && (
            <div className="absolute inset-0 z-40 bg-neutral-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                <i className="fa-solid fa-circle-notch fa-spin text-primary text-4xl"></i>
                <p className="text-neutral-white font-bold tracking-widest uppercase mt-4">Đang tải ảnh lên...</p>
            </div>
          )}
      </div>

      <div className="bg-neutral-white dark:bg-dark-surface border-t border-slate-200 dark:border-dark-border pb-safe pt-6 px-6 z-40 w-full rounded-t-xl">
          
          <div className="flex items-center gap-4 justify-center mb-6 px-2">
              <i className="fa-solid fa-image text-slate-400 dark:text-dark-text-secondary text-sm"></i>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.05" 
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                disabled={isUploading}
                className="w-full h-1.5 bg-slate-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
              />
              <i className="fa-solid fa-image text-neutral-black dark:text-dark-text-primary text-lg"></i>
          </div>

          <div className="flex gap-4 mb-4">
               <button 
                  onClick={onCancel} 
                  disabled={isUploading}
                  className="flex-1 py-4 bg-slate-100 dark:bg-dark-border/50 hover:dark:bg-dark-border text-slate-600 dark:text-dark-text-primary rounded-xl font-extrabold text-base active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
               >
                   Hủy
               </button>
               <button 
                  onClick={handleConfirmCrop}
                  disabled={!imageLoaded || isUploading}
                  className="flex-1 py-4 bg-primary text-neutral-white rounded-xl font-extrabold text-base active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg shadow-primary/30"
               >
                  {isUploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Lưu Ảnh'}
               </button>
          </div>
      </div>
    </div>
  );
};

export default ImageCropper;