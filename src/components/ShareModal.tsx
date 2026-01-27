import { X } from 'lucide-react';
import qrCode from '@/qr.png';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Share This Scavenger Hunt
          </h2>
          <p className="text-gray-600 mb-6">
            Scan the QR code to join the fun!
          </p>

          {/* QR Code */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-400 p-6 rounded-2xl inline-block mb-6">
            <img src={qrCode} alt="Scan to join scavenger hunt" className="w-48 h-48 bg-white rounded-xl" />
          </div>

          {/* Instructions */}
          <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
            <p><strong>📱 To scan:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• iPhone: Open Camera app and point at QR code</li>
              <li>• Android: Open Camera app or Google Lens</li>
            </ul>
            <p className="mt-3"><strong>🔗 Or share this link:</strong></p>
            <p className="text-indigo-600 break-all">https://scavenger2026.onrender.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
