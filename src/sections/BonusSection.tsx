import { useState, useEffect } from 'react';
import { Gift, Info } from 'lucide-react';
import { bonusItems } from '@/data/scavengerData';

interface BonusSectionProps {
  isVisible: boolean;
  isUnlocked: boolean;
}

export function BonusSection({ isVisible, isUnlocked }: BonusSectionProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && isUnlocked) {
      setTimeout(() => setIsAnimated(true), 300);
    }
  }, [isVisible, isUnlocked]);

  const handleCardClick = (id: string) => {
    setFlippedCard(flippedCard === id ? null : id);
  };

  if (!isUnlocked) return null;

  return (
    <section className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-blue-50 opacity-50" />
      
      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-12">
          {/* Info message about triple tap */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <Info className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="text-green-800 font-medium">
                  💡 Tip: Triple tap the progress bar to reveal all gospel analogies!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  This helps when youth are ready to discuss their insights.
                </p>
              </div>
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full mb-4">
            <Gift className="w-5 h-5" />
            <span className="font-semibold">Bonus Round Unlocked!</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Extra Challenges
          </h2>
          <p className="text-gray-600 text-lg">
            Complete these bonus items for extra points!
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bonusItems.map((item, index) => {
            const isFlipped = flippedCard === item.id;
            
            return (
              <div
                key={item.id}
                className={`transform transition-all duration-500 ${
                  isAnimated 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-8 opacity-0'
                }`}
                style={{ 
                  transitionDelay: `${index * 100}ms`,
                  perspective: '1000px'
                }}
              >
                <div
                  className={`relative h-64 cursor-pointer transition-transform duration-700`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                  onClick={() => handleCardClick(item.id)}
                >
                  {/* Front of card */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-3xl shadow-lg flex flex-col items-center justify-center p-6 text-white backface-hidden`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className={`mb-4 ${
                      index === 0 ? 'animate-float-slow' :
                      index === 1 ? 'animate-float-medium' :
                      index === 2 ? 'animate-float-fast' : 'animate-float-slow'
                    }`}>
                      <span className="text-6xl">
                        {item.icon}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-center mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-center opacity-90">
                      {item.hint}
                    </p>
                    <div className="mt-4 text-xs opacity-70">
                      Click to reveal meaning
                    </div>
                  </div>
                  
                  {/* Back of card */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-lg flex flex-col items-center justify-center p-6 text-white"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <div className="text-4xl mb-3">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-bold text-center mb-3">
                      {item.title}
                    </h3>
                    <p className="text-sm text-center text-gray-300 leading-relaxed">
                      {item.connection}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
