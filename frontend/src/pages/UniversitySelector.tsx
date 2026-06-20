import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UniversitySelector() {
  const navigate = useNavigate();

  const handleSelect = (university: 'sau' | 'subu') => {
    navigate(`/${university}/login`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-white text-4xl mb-4">Kampüs Sohbet</h1>
          <p className="text-white/70 text-lg">Üniversiteni seç ve rastgele öğrencilerle tanış</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sakarya Üniversitesi */}
          <button
            onClick={() => handleSelect('sau')}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 mx-auto">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-white text-2xl mb-2">Sakarya Üniversitesi</h2>
              <p className="text-blue-100">SAÜ Öğrencileri</p>
            </div>
          </button>

          {/* Sakarya Uygulamalı Bilimler Üniversitesi */}
          <button
            onClick={() => handleSelect('subu')}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 mx-auto">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-white text-2xl mb-2">Sakarya Uygulamalı Bilimler</h2>
              <p className="text-emerald-100">SUBÜ Öğrencileri</p>
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/50 text-sm">
            Not: Bu uygulama sadece eğitim amaçlıdır. Lütfen nezaket kurallarına uyun.
          </p>
        </div>
      </div>
    </div>
  );
}