import { SabotageType } from '@/lib/types';

interface SabotageEffectsWrapperProps {
  activeSabotages: SabotageType[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that applies visual sabotage effects to its children.
 * Used to consistently apply sabotage effects across all preview views.
 */
export function SabotageEffectsWrapper({
  activeSabotages,
  children,
  className = '',
}: SabotageEffectsWrapperProps) {
  const hasLightsOff = activeSabotages.includes('lights-off');
  const hasRotate180 = activeSabotages.includes('rotate-180');
  const hasInvertedColors = activeSabotages.includes('inverted-colors');
  const hasGlitterBomb = activeSabotages.includes('glitter-bomb');

  return (
    <div className={`relative ${className}`}>
      {/* Lights-Off Sabotage Overlay */}
      {hasLightsOff && (
        <div className="absolute inset-0 bg-black z-10 pointer-events-none" />
      )}

      {/* Rotate and Invert Container */}
      <div
        className="w-full h-full"
        style={{
          ...(hasRotate180 && {
            transform: 'rotate(180deg)',
          }),
        }}
      >
        <div
          className="w-full h-full"
          style={{
            ...(hasInvertedColors && {
              filter: 'invert(1)',
            }),
            ...(hasRotate180 && {
              transform: 'rotate(180deg)',
            }),
          }}
        >
          {children}
        </div>
      </div>

      {/* ULTRA INTENSE Glitter bomb overlay */}
      {hasGlitterBomb && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Rainbow animated gradient background */}
          <div className="rainbow-gradient-intense" />

          {/* Multiple layers of sparkles */}
          <div className="sparkle-layer-1">
            {[...Array(150)].map((_, i) => (
              <div
                key={`sparkle-1-${i}`}
                className="sparkle-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  width: `${Math.random() * 15 + 8}px`,
                  height: `${Math.random() * 15 + 8}px`,
                }}
              />
            ))}
          </div>

          {/* Stars */}
          <div className="star-layer">
            {[...Array(80)].map((_, i) => (
              <div
                key={`star-${i}`}
                className="star-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  fontSize: `${Math.random() * 20 + 15}px`,
                }}
              >
                ✨
              </div>
            ))}
          </div>

          {/* Hearts */}
          <div className="heart-layer">
            {[...Array(40)].map((_, i) => (
              <div
                key={`heart-${i}`}
                className="heart-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.5}s`,
                  fontSize: `${Math.random() * 25 + 20}px`,
                }}
              >
                💖
              </div>
            ))}
          </div>

          {/* Unicorns */}
          <div className="unicorn-layer">
            {[...Array(20)].map((_, i) => (
              <div
                key={`unicorn-${i}`}
                className="unicorn-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 4}s`,
                  fontSize: `${Math.random() * 30 + 25}px`,
                }}
              >
                🦄
              </div>
            ))}
          </div>

          {/* Glitter text effect overlay */}
          <div className="glitter-text-overlay" />
        </div>
      )}

      <style jsx>{`
        .rainbow-gradient-intense {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            rgba(255, 0, 255, 0.25),
            rgba(255, 105, 180, 0.25),
            rgba(255, 215, 0, 0.25),
            rgba(0, 255, 255, 0.25),
            rgba(255, 0, 255, 0.25)
          );
          background-size: 400% 400%;
          animation: rainbow-intense 3s ease infinite;
        }

        @keyframes rainbow-intense {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .sparkle-layer-1 {
          position: absolute;
          inset: 0;
        }

        .sparkle-particle {
          position: absolute;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 215, 0, 0.6) 50%, transparent 70%);
          border-radius: 50%;
          animation: sparkle-intense 2s ease-in-out infinite;
          box-shadow: 0 0 10px 3px rgba(255, 255, 255, 0.8),
                      0 0 20px 6px rgba(255, 215, 0, 0.6),
                      0 0 30px 10px rgba(255, 105, 180, 0.4);
        }

        @keyframes sparkle-intense {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.5) rotate(180deg);
          }
        }

        .star-layer {
          position: absolute;
          inset: 0;
        }

        .star-particle {
          position: absolute;
          animation: float-star 3s ease-in-out infinite;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.9),
                       0 0 20px rgba(255, 215, 0, 0.7);
          filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.8));
        }

        @keyframes float-star {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-30px) rotate(180deg) scale(1.3);
            opacity: 1;
          }
        }

        .heart-layer {
          position: absolute;
          inset: 0;
        }

        .heart-particle {
          position: absolute;
          animation: pulse-heart 2s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(255, 105, 180, 0.9));
        }

        @keyframes pulse-heart {
          0%, 100% {
            transform: scale(1) rotate(-10deg);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.4) rotate(10deg);
            opacity: 1;
          }
        }

        .unicorn-layer {
          position: absolute;
          inset: 0;
        }

        .unicorn-particle {
          position: absolute;
          animation: bounce-unicorn 3s ease-in-out infinite;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.9));
        }

        @keyframes bounce-unicorn {
          0%, 100% {
            transform: translateY(0) rotate(-5deg);
            opacity: 0.8;
          }
          25% {
            transform: translateY(-40px) rotate(5deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-60px) rotate(-5deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-40px) rotate(5deg);
            opacity: 1;
          }
        }

        .glitter-text-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.3) 75%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: glitter-scan 2s linear infinite;
          pointer-events: none;
        }

        @keyframes glitter-scan {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
