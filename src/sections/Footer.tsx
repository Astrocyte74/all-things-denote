import { PartyPopper, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-16 bg-gradient-to-b from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 text-yellow-300 opacity-30 animate-float-slow">
        <PartyPopper className="w-full h-full" />
      </div>
      <div className="absolute bottom-10 right-10 w-16 h-16 text-blue-300 opacity-30 animate-float-medium">
        <Heart className="w-full h-full" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10">
        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            <span className="inline-block animate-wave" style={{ animationDelay: '0ms' }}>H</span>
            <span className="inline-block animate-wave" style={{ animationDelay: '50ms' }}>a</span>
            <span className="inline-block animate-wave" style={{ animationDelay: '100ms' }}>v</span>
            <span className="inline-block animate-wave" style={{ animationDelay: '150ms' }}>e</span>
            <span className="inline-block mx-2"> </span>
            <span className="inline-block animate-wave" style={{ animationDelay: '200ms' }}>F</span>
            <span className="inline-block animate-wave" style={{ animationDelay: '250ms' }}>u</span>
            <span className="inline-block animate-wave" style={{ animationDelay: '300ms' }}>n</span>
            <span className="inline-block animate-wave" style={{ animationDelay: '350ms' }}>!</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Remember to regroup and share your photos and insights with each other. 
            The best part is hearing how each group connected the items to the gospel!
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500">
            Remember to always follow store policies and be respectful while participating
          </p>
        </div>
      </div>
    </footer>
  );
}
