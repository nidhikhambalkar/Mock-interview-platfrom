import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  Terminal, BarChart2, Megaphone, Wallet, Users, 
  ChevronRight, Brain, AlertCircle 
} from 'lucide-react';

const DOMAINS = [
  { id: 'Software Engineering', label: 'Software Engineering', icon: Terminal, desc: 'Coding, system design, and algorithmic thinking.' },
  { id: 'Data Science', label: 'Data Science', icon: BarChart2, desc: 'Statistics, machine learning, and data analytics.' },
  { id: 'Marketing', label: 'Marketing', icon: Megaphone, desc: 'Branding, campaign strategy, and growth marketing.' },
  { id: 'Finance', label: 'Finance', icon: Wallet, desc: 'Corporate valuation, investment, and financial modeling.' },
  { id: 'HR/Management', label: 'HR/Management', icon: Users, desc: 'Behavioral dynamics, leadership, and team operations.' },
];

const DIFFICULTIES = [
  { id: 'Beginner', label: 'Beginner', desc: 'Focuses on core conceptual fundamentals.' },
  { id: 'Intermediate', label: 'Intermediate', desc: 'Introduces complex situational problems.' },
  { id: 'Advanced', label: 'Advanced', desc: 'Demands deep technical depth and system architecture.' }
];

const MOCK_TIPS = [
  "Be concise but thorough. Focus on structuring your answers using the STAR method (Situation, Task, Action, Result).",
  "Technical questions value your critical thinking process as much as the final correct answer.",
  "Speak clearly and explain your underlying rationale when utilizing Voice Mode.",
  "Make sure to meet the 50-word minimum requirement for AI evaluation metrics.",
  "Take a breath and structure your points before answering situational management questions."
];

export const SetupInterview: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<string>('Software Engineering');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const navigate = useNavigate();

  // Cycle tips during generation load
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % MOCK_TIPS.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleStartInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/login');
        return;
      }

      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/sessions/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({
          domain: selectedDomain,
          difficulty: selectedDifficulty
        })
      });

      if (!response.ok) {
        throw new Error('Server failed to generate questions. Please try again.');
      }

      const data = await response.json();
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('Claude API did not return any questions. Please retry.');
      }

      // Navigate to interview room, passing setup parameters and questions
      navigate('/interview', {
        state: {
          domain: selectedDomain,
          difficulty: selectedDifficulty,
          questions: data.questions
        }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during session generation.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8 animate-pulse">
          {/* Custom Animated Brain Icon */}
          <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/30 rounded-3xl flex items-center justify-center text-brand-400 mx-auto glow-amber animate-bounce">
            <Brain className="w-10 h-10" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-extrabold text-white">Generating AI Questions</h3>
            <p className="text-dark-400 text-sm">
              Claude is analyzing the {selectedDomain} track to formulate {selectedDifficulty} interview questions...
            </p>
          </div>

          {/* Prepare Tip Carousel */}
          <div className="glass-panel p-6 rounded-2xl border-white/5 max-w-sm mx-auto text-left relative min-h-[140px] flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400 block mb-1">
              Interview tip
            </span>
            <p className="text-xs text-dark-300 leading-relaxed transition-opacity duration-500">
              "{MOCK_TIPS[tipIndex]}"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-white">Configure Your Practice Session</h1>
        <p className="text-dark-400 text-sm leading-relaxed">
          Select your target career track and experience level. Our evaluation algorithms adapt to your specific choices.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Domain Selector */}
        <div className="md:col-span-8 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span className="w-1.5 h-4 bg-brand-500 rounded-full"></span>
            1. Select Professional Domain
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain.id)}
                  className={`glass-panel p-5 rounded-2xl flex items-start gap-4 text-left cursor-pointer transition-all border ${
                    isSelected 
                      ? 'border-brand-500/50 bg-brand-500/5 glow-amber' 
                      : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-dark-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-white text-sm">{domain.label}</h4>
                    <p className="text-dark-400 text-xs leading-relaxed">{domain.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="md:col-span-4 space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span className="w-1.5 h-4 bg-accent-orange rounded-full"></span>
              2. Select Difficulty
            </h3>
            
            <div className="flex flex-col gap-3">
              {DIFFICULTIES.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    onClick={() => setSelectedDifficulty(diff.id)}
                    className={`glass-panel p-4 rounded-xl text-left cursor-pointer transition-all border ${
                      isSelected 
                        ? 'border-accent-orange/50 bg-accent-orange/5' 
                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <h4 className="font-semibold text-white text-xs sm:text-sm">{diff.label}</h4>
                    <p className="text-dark-400 text-xs mt-1 leading-relaxed">{diff.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Launch Action */}
          <button
            onClick={handleStartInterview}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-accent-orange hover:from-brand-600 hover:to-accent-orange text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/10 transition-all cursor-pointer transform active:scale-98 text-sm"
          >
            Launch Interview Session
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default SetupInterview;
