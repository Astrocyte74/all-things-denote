import { useState, useEffect } from 'react';
import { Camera, Users, Heart, Map } from 'lucide-react';
import { rules } from '@/data/scavengerData';

interface RulesProps {
  isVisible: boolean;
  collapsed?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  '📸': <Camera className="w-12 h-12" strokeWidth={1.5} />,
  '🚶': <Camera className="w-12 h-12" strokeWidth={1.5} />,
  '👥': <Users className="w-12 h-12" strokeWidth={1.5} />,
  '❤️': <Heart className="w-12 h-12" strokeWidth={1.5} />,
  '🗺️': <Map className="w-12 h-12" strokeWidth={1.5} />
};

const colorMap: Record<string, string> = {
  'rule-1': 'from-purple-500 to-pink-400',
  'rule-2': 'from-blue-500 to-cyan-400',
  'rule-3': 'from-orange-500 to-red-400',
  'rule-4': 'from-green-500 to-emerald-400'
};

export function Rules({ isVisible, collapsed = false }: RulesProps) {
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
            Four simple rules for a great scavenger hunt!
          </p>
        </div>

        {/* Four Cards - 2x2 Grid */}
        <div className="grid md:grid-cols-2 gap-6">
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

                {/* Bullet Points */}
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
