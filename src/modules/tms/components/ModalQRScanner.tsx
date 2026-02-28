import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onClose: () => void;
  onScan: (data: string) => void;
  onError: (msg: string) => void;
}

const ModalQRScanner: React.FC<Props> = ({ onClose, onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [hasCamera, setHasCamera] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
        try {
            await scanner.start(
              { facingMode: "environment" },
              {
                fps: 20,
                qrbox: (viewWidth, viewHeight) => {
                    const size = Math.min(viewWidth, viewHeight) * 0.7;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0
              },
              (decodedText) => {
                if (isScanning) {
                  setIsScanning(false);
                  if ('vibrate' in navigator) {
                    navigator.vibrate(100);
                  }
                  scanner.stop().then(() => {
                    onScan(decodedText);
                  }).catch(err => {
                    console.error(err);
                    onScan(decodedText);
                  });
                }
              },
              () => {}
            );
            setHasCamera(true);
        } catch (err) {
            console.error("Scanner start error:", err);
            onError("Không thể mở camera. Vui lòng kiểm tra quyền truy cập.");
            onClose();
        }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
          const s = scannerRef.current;
          if (s.isScanning) {
              s.stop().catch(err => console.error("Error stopping scanner", err));
          }
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[5000] bg-neutral-black flex flex-col overflow-hidden font-sans">
      <style>{`
        #qr-reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
        }
        #qr-reader {
            border: none !important;
            overflow: hidden;
            background: #000;
        }
        @keyframes scan-vertical {
            0% { top: 0%; }
            100% { top: 100%; }
        }
        .scanner-corner {
            width: 40px;
            height: 40px;
            border-color: var(--color-primary);
            position: absolute;
            z-index: 20;
        }
      `}</style>
      
      <div className="safe-top bg-black/40 border-b border-white/5 px-6 py-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                  <i className="fa-solid fa-qrcode text-primary text-sm"></i>
              </div>
              <span className="text-neutral-white dark:text-dark-text-primary font-bold tracking-tight">Quét mã Kiosk</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-dark-text-secondary hover:text-neutral-white dark:hover:text-dark-text-primary transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        <div id="qr-reader" className="absolute inset-0"></div>
        
        <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-black/60"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[300px] max-h-[300px] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-3xl">
                
                <div className="scanner-corner -top-2 -left-2 border-t-4 border-l-4 rounded-tl-2xl"></div>
                <div className="scanner-corner -top-2 -right-2 border-t-4 border-r-4 rounded-tr-2xl"></div>
                <div className="scanner-corner -bottom-2 -left-2 border-b-4 border-l-4 rounded-bl-2xl"></div>
                <div className="scanner-corner -bottom-2 -right-2 border-b-4 border-r-4 rounded-br-2xl"></div>

                <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-[scan-vertical_2.5s_ease-in-out_infinite] opacity-60"></div>
                
                <div className="absolute -bottom-10 left-0 w-full text-center">
                    <span className="text-xxs text-primary/80 font-black tracking-[0.2em] uppercase animate-pulse">Scanning Kiosk ID...</span>
                </div>
            </div>
        </div>

        {!hasCamera && (
            <div className="absolute inset-0 z-[60] bg-neutral-black flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-primary/80 text-sm font-bold uppercase tracking-widest">Khởi tạo camera...</p>
            </div>
        )}
      </div>
      
      <div className="safe-bottom bg-neutral-black/90 dark:bg-dark-bg/90 backdrop-blur-md border-t border-white/5 dark:border-dark-border p-8 z-50">
          <div className="max-w-xs mx-auto text-center">
              <h3 className="text-neutral-white dark:text-dark-text-primary font-bold mb-2">Hướng dẫn</h3>
              <p className="text-slate-400 dark:text-dark-text-secondary text-sm leading-relaxed">
                  Di chuyển camera để mã QR trên màn hình Kiosk nằm gọn trong khung hình vuông.
              </p>
              
              <div className="mt-8 flex justify-center gap-4">
                   <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 dark:text-dark-text-secondary">
                          <i className="fa-solid fa-lightbulb text-sm"></i>
                      </div>
                      <span className="text-xxs text-slate-500 dark:text-dark-text-secondary uppercase font-bold tracking-tighter">Đủ sáng</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 dark:text-dark-text-secondary">
                          <i className="fa-solid fa-hand text-sm"></i>
                      </div>
                      <span className="text-xxs text-slate-500 dark:text-dark-text-secondary uppercase font-bold tracking-tighter">Giữ chắc tay</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ModalQRScanner;