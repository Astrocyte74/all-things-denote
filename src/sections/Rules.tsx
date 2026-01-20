import { useState, useEffect } from 'react';
import { Camera, Users, Heart, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { rules } from '@/data/scavengerData';

interface RulesProps {
  isVisible: boolean;
  collapsed?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  '📸': <Camera className="w-6 h-6" />,
  '👥': <Users className="w-6 h-6" />,
  '❤️': <Heart className="w-6 h-6" />,
  '⭐': <Star className="w-6 h-6" />
};

export function Rules({ isVisible, collapsed = false }: RulesProps) {
  const [openRule, setOpenRule] = useState<string | null>(null);
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
      setOpenRule(null);
    }
  }, [collapsed]);

  const toggleRule = (id: string) => {
    setOpenRule(openRule === id ? null : id);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setOpenRule(null);
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
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  // Expanded state
  return (
    <section className="py-16 md:py-24 bg-white relative">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Game Rules
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
          <p className="text-gray-600 text-lg">
            Follow these guidelines to keep the hunt fun and respectful
          </p>
        </div>

        <div className="space-y-4">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`transform transition-all duration-500 ${
                isAnimated
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-8 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className={`bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
                  openRule === rule.id ? 'shadow-lg' : ''
                }`}
                onClick={() => toggleRule(rule.id)}
              >
                <div className="p-6 flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors duration-300 ${
                    openRule === rule.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {iconMap[rule.icon]}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {rule.title}
                    </h3>
                  </div>

                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                      openRule === rule.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                <div className={`overflow-hidden transition-all duration-300 ${
                  openRule === rule.id ? 'max-h-40' : 'max-h-0'
                }`}>
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-gray-600 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
