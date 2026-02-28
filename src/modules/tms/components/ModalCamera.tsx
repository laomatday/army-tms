import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
  onCapture: (base64: string, lat: number, lng: number) => void;
  onError: (msg: string) => void;
}

const ModalCamera: React.FC<Props> = ({ onClose, onCapture, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isHighAccuracy, setIsHighAccuracy] = useState(true);

  // Tách biệt logic Camera và GPS để tránh khởi động lại camera khi GPS thay đổi
  useEffect(() => {
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'user'
            // Bỏ constraints width/height để tránh lỗi trên một số thiết bị iOS
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS cần gọi play() thủ công trong một số trường hợp
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Lỗi phát video:", e));
          };
        }
      } catch (err: any) {
        console.error("Lỗi Camera:", err);
        onError(`Không thể truy cập camera: ${err.message || err.name}`);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError]);

  // Logic GPS tách riêng
  useEffect(() => {
    const handleSuccess = (pos: GeolocationPosition) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn(`GPS Error (${err.code}): ${err.message}`);
      if (isHighAccuracy) {
        // Nếu thất bại với high accuracy, thử lại với low accuracy
        setIsHighAccuracy(false);
      } else {
        onError(`Không thể lấy vị trí GPS: ${err.message}`);
      }
    };

    const options = { 
      enableHighAccuracy: isHighAccuracy, 
      timeout: 10000, 
      maximumAge: 0 
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isHighAccuracy, onError]);

  const handleCapture = () => {
    if (!videoRef.current || !location) {
        onError("Chưa có dữ liệu video hoặc vị trí.");
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Nén ảnh với chất lượng 80% để giảm dung lượng
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(base64Image, location.lat, location.lng);
    } else {
        onError("Không thể xử lý ảnh.");
    }
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-neutral-black flex flex-col animate-fade-in touch-none">
      {/* Video chiếm trọn màn hình */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="flex-1 w-full h-full object-cover transform scale-x-[-1]" 
      />
      
      {/* Overlay controls */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-neutral-black/90 to-transparent pt-20 pb-safe px-6 pb-8 flex gap-4">
        <button 
            onClick={onClose} 
            className="w-16 h-16 rounded-xl bg-neutral-white/20 backdrop-blur-md text-neutral-white font-extrabold flex items-center justify-center active:scale-95 transition-all border border-neutral-white/30"
        >
            <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
        <button 
            onClick={handleCapture} 
            disabled={!location}
            className="flex-1 h-16 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-neutral-white rounded-xl font-extrabold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-primary/30"
        >
          {!location ? (
              <><i className="fa-solid fa-location-crosshairs fa-fade"></i> Đang lấy GPS...</>
          ) : (
              <><i className="fa-solid fa-camera"></i> Chụp ảnh</>
          )}
        </button>
      </div>
    </div>
  );
};

export default ModalCamera;