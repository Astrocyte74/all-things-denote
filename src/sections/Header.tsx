import { useEffect, useRef, useState } from 'react';
import { Camera, ShoppingCart, Smile, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onStart: () => void;
}

export function Header({ onStart }: HeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setMousePos({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-yellow-50 animate-gradient-pulse" />
      
      {/* Floating decorative elements */}
      <div 
        className="absolute top-20 left-10 md:left-20 w-16 h-16 md:w-24 md:h-24 opacity-80"
        style={{
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="animate-float-slow">
          <ShoppingCart className="w-full h-full text-yellow-400 drop-shadow-lg" />
        </div>
      </div>
      
      <div 
        className="absolute top-32 right-10 md:right-32 w-12 h-12 md:w-20 md:h-20 opacity-70"
        style={{
          transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="animate-float-medium">
          <Camera className="w-full h-full text-blue-500 drop-shadow-lg" />
        </div>
      </div>
      
      <div 
        className="absolute bottom-32 left-20 md:left-40 w-10 h-10 md:w-16 md:h-16 opacity-60"
        style={{
          transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="animate-float-fast">
          <Smile className="w-full h-full text-yellow-400 drop-shadow-lg" />
        </div>
      </div>
      
      <div 
        className="absolute bottom-40 right-20 md:right-40 w-14 h-14 md:w-20 md:h-20 opacity-50"
        style={{
          transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 25}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="animate-float-medium">
          <Lightbulb className="w-full h-full text-blue-400 drop-shadow-lg" />
        </div>
      </div>

      {/* Main content */}
      <div 
        className="relative z-10 text-center px-4 md:px-8 max-w-4xl mx-auto"
        style={{
          transform: `rotateX(${mousePos.y * 5}deg) rotateY(${mousePos.x * 5}deg)`,
          transition: 'transform 0.3s ease-out',
          transformStyle: 'preserve-3d'
        }}
      >
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 animate-fade-in-up">
          Gospel Analogies
          <br />
          <span className="text-blue-600">Scavenger Hunt</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-6 animate-fade-in-up animation-delay-200">
          Finding Gospel Truths in Everyday Things
        </p>

        <blockquote className="max-w-2xl mx-auto mb-8 animate-fade-in-up animation-delay-300">
          <p className="text-base md:text-lg text-gray-500 italic leading-relaxed">
            "All things denote there is a God; yea, even the earth, and all things that are upon the face of it..."
          </p>
          <cite className="text-sm text-gray-400 not-italic mt-2 block">— Alma 30:44</cite>
        </blockquote>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
          <Button 
            onClick={onStart}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Start the Hunt!
          </Button>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full h-auto">
          <path
            fill="white"
            d="M0,64 C480,120 960,0 1440,64 L1440,120 L0,120 Z"
          />
        </svg>
      </div>
    </section>
  );
}
