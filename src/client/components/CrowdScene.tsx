import React, { useMemo } from 'react';
import { Impostor } from '../../shared/types/game';

interface CrowdSceneProps {
  impostors: Impostor[];
  onPersonClick: (x: number, y: number) => void;
  foundImpostors: string[];
}

interface Person {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'human' | 'impostor';
  variant: number;
  depth: number;
  impostorId?: string;
}

export const CrowdScene: React.FC<CrowdSceneProps> = ({
  impostors,
  onPersonClick,
  foundImpostors,
}) => {
  const crowd = useMemo(() => {
    const people: Person[] = [];
    
    // Add regular humans (background crowd)
    for (let i = 0; i < 300; i++) {
      people.push({
        id: `human_${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 0.3 + Math.random() * 0.4, // Varied sizes for depth
        type: 'human',
        variant: Math.floor(Math.random() * 6), // Different human types
        depth: Math.random(), // For layering
      });
    }
    
    // Add impostors at their specific locations
    impostors.forEach((impostor) => {
      people.push({
        id: `impostor_${impostor.id}`,
        x: impostor.x + (Math.random() - 0.5) * 2, // Slight randomization
        y: impostor.y + (Math.random() - 0.5) * 2,
        size: impostor.difficulty === 'easy' ? 0.8 : 
              impostor.difficulty === 'medium' ? 0.5 : 0.3,
        type: 'impostor',
        variant: Math.floor(Math.random() * 3), // Different impostor variants
        depth: Math.random(),
        impostorId: impostor.id,
      });
    });
    
    // Sort by depth for proper layering
    return people.sort((a, b) => a.depth - b.depth);
  }, [impostors]);

  const getHumanEmoji = (variant: number) => {
    const humans = ['🧑', '👩', '👨', '🧑‍💼', '👩‍💼', '👨‍💼'];
    return humans[variant];
  };

  const getImpostorEmoji = (variant: number) => {
    const aliens = ['👽', '🛸', '👾'];
    return aliens[variant];
  };

  const handlePersonClick = (person: Person, event: React.MouseEvent) => {
    event.stopPropagation();
    onPersonClick(person.x, person.y);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900" />
      
      {/* Atmospheric effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-300 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-20 right-20 w-24 h-24 bg-purple-300 rounded-full blur-2xl opacity-20" />
        <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-blue-300 rounded-full blur-3xl opacity-25" />
      </div>

      {/* Ground/floor pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Crowd */}
      {crowd.map((person) => {
        const isFound = person.type === 'impostor' && 
                       person.impostorId && 
                       foundImpostors.includes(person.impostorId);
        
        return (
          <div
            key={person.id}
            className={`absolute cursor-pointer transition-all duration-200 hover:scale-110 select-none ${
              person.type === 'impostor' && !isFound ? 'hover:drop-shadow-lg' : ''
            } ${isFound ? 'opacity-50' : ''}`}
            style={{
              left: `${person.x}%`,
              top: `${person.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${person.size * 2}rem`,
              zIndex: Math.floor(person.depth * 100),
              filter: `brightness(${0.7 + person.depth * 0.6}) contrast(${0.8 + person.depth * 0.4})`,
            }}
            onClick={(e) => handlePersonClick(person, e)}
          >
            {person.type === 'impostor' ? (
              <span className={`${isFound ? 'grayscale' : 'text-green-400'} drop-shadow-lg`}>
                {getImpostorEmoji(person.variant)}
              </span>
            ) : (
              <span className="text-gray-300">
                {getHumanEmoji(person.variant)}
              </span>
            )}
            
            {/* Subtle glow for impostors */}
            {person.type === 'impostor' && !isFound && (
              <div 
                className="absolute inset-0 rounded-full bg-green-400 opacity-20 blur-sm animate-pulse"
                style={{ transform: 'scale(1.5)' }}
              />
            )}
          </div>
        );
      })}

      {/* Found impostor markers */}
      {impostors
        .filter(impostor => foundImpostors.includes(impostor.id))
        .map((impostor) => (
          <div
            key={`marker_${impostor.id}`}
            className="absolute border-4 border-green-400 bg-green-400 bg-opacity-20 rounded-lg flex items-center justify-center animate-pulse"
            style={{
              left: `${impostor.x}%`,
              top: `${impostor.y}%`,
              width: `${impostor.width}%`,
              height: `${impostor.height}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
            }}
          >
            <div className="text-green-400 font-bold text-2xl drop-shadow-lg">✓</div>
          </div>
        ))}

      {/* Floating particles for atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={`particle_${i}`}
            className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};