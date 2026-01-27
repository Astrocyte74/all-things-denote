import { useState, useEffect } from 'react';
import { Camera, Users, Heart, Map, Smartphone, PersonStanding } from 'lucide-react';
import { rules } from '@/data/scavengerData';
import qrCode from '/qr.png';

interface RulesProps {
  isVisible: boolean;
  collapsed?: boolean;
  onChangePath?: () => void;
  currentPathId?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  '📸': <Camera className="w-12 h-12" strokeWidth={1.5} />,
  '🚶': <PersonStanding className="w-12 h-12" strokeWidth={1.5} />,
  '👥': <Users className="w-12 h-12" strokeWidth={1.5} />,
  '❤️': <Heart className="w-12 h-12" strokeWidth={1.5} />,
  '🗺️': <Map className="w-12 h-12" strokeWidth={1.5} />,
  '📱': <Smartphone className="w-12 h-12" strokeWidth={1.5} />
};

const colorMap: Record<string, string> = {
  'rule-1': 'from-purple-500 to-pink-400',
  'rule-2': 'from-blue-500 to-cyan-400',
  'rule-3': 'from-orange-500 to-red-400',
  'rule-4': 'from-green-500 to-emerald-400',
  'rule-5': 'from-indigo-500 to-purple-400'
};

export function Rules({ isVisible, collapsed = false, onChangePath, currentPathId = 'A' }: RulesProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setIsAnimated(true), 100);
    }
  }, [isVisible]);

  // Auto-collapse when collapsed prop changes
  useEffect(() => {
    if (collapsed) {
      setIsExpanded(false);
    }
  }, [collapsed]);

  // When expanding from collapsed state, trigger animation
  useEffect(() => {
    if (isExpanded && collapsed) {
      setTimeout(() => setIsAnimated(true), 50);
    }
  }, [isExpanded, collapsed]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Collapsed state - just show a small header
  if (collapsed && !isExpanded) {
    return (
      <section className="py-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <button
            onClick={toggleExpand}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
          >
            Show Game Rules
            <span className="text-lg">↓</span>
          </button>
        </div>
      </section>
    );
  }

  // Expanded state - show all 3 cards
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h2 className="text-3xl font-bold text-gray-900">
              How to Play
            </h2>
            {collapsed && (
              <button
                onClick={toggleExpand}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Hide
              </button>
            )}
          </div>
          <p className="text-gray-600">
            Five simple rules for a great scavenger hunt!
          </p>
        </div>

        {/* Five Cards - 3 on top, 2 centered on bottom */}
        <div className="grid md:grid-cols-3 gap-6">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`transform transition-all duration-700 ${
                isAnimated
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className={`bg-gradient-to-br ${colorMap[rule.id]} rounded-3xl p-8 text-white h-full flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow`}>
                {/* Large Icon */}
                <div className="mb-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                  {iconMap[rule.icon]}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-6">
                  {rule.title}
                </h3>

                {/* Special content for Invite Friends (QR) and Choose Your Path (buttons) */}
                {rule.id === 'rule-5' ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="bg-white p-3 rounded-2xl mb-4">
                      <img src={qrCode} alt="Scan to join" className="w-32 h-32" />
                    </div>
                    <p className="text-sm text-white/90 text-center max-w-xs">
                      Scan this code with your phone camera to join the scavenger hunt!
                    </p>
                  </div>
                ) : rule.id === 'rule-4' && onChangePath ? (
                  <div className="flex-1 flex flex-col justify-center items-center gap-4">
                    {/* Current Path Display */}
                    <div className="text-center">
                      <div className="text-white/80 text-sm mb-2">Your Path</div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block">
                        <span className="text-white font-black text-5xl font-bold">
                          {currentPathId}
                        </span>
                      </div>
                    </div>

                    {/* Change Path Button */}
                    <button
                      onClick={onChangePath}
                      className="bg-white hover:bg-gray-100 text-green-700 font-bold py-3 px-6 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                    >
                      Change Path
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center">
                    <ul className="space-y-3 text-left">
                      {rule.description.split('\n').map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-yellow-300 font-bold mt-1">✓</span>
                          <span className="text-sm leading-relaxed">
                            {item.replace(/^[•]\s*/, '')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
