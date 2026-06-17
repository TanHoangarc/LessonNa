import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Topic, UserStats } from '../types';
import { TOPICS } from '../data/lessons';
import { motion } from 'motion/react';
import { playSoundEffect } from '../utils/audioHelper';

interface DashboardProps {
  topics: Topic[];
  userStats: UserStats;
  onSelectTopic: (topicId: string) => void;
  onOpenCustomLessonCreator: () => void;
}

export default function Dashboard({
  topics,
  userStats,
  onSelectTopic,
  onOpenCustomLessonCreator
}: DashboardProps) {
  // Safe icon lookup function
  const renderIcon = (iconName: string) => {
    // Dynamically retrieve the Lucide icon or fallback to Star
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Star;
    return <IconComponent className="w-8 h-8 text-white" />;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="dashboard-container">
      {/* Mascot Greeting - Geometric Balance Block Style */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-l-2 border-r-2 border-t-2 border-teal-200 border-b-8 border-teal-500 rounded-[32px] p-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-sm relative"
        id="mascot-greeting"
      >
        <div className="w-24 h-24 bg-emerald-400 rounded-full flex items-center justify-center text-5xl border-b-4 border-emerald-600 relative z-10 animate-bounce">
          💡
          <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 text-xs font-black px-1.5 py-0.5 rounded-full border border-slate-900">
            CÔ
          </div>
        </div>
        <div className="text-center md:text-left flex-1">
          <h2 className="text-2xl font-black text-sky-950 tracking-tight font-sans">
            Chào mừng bé yêu của Cô Chích Chòe! 👋
          </h2>
          <p className="text-teal-900/80 mt-2 text-sm font-extrabold font-sans leading-relaxed">
            Hôm nay chúng mình sẽ cùng học các câu nói tiếng Việt siêu hay, học phát âm cực chuẩn và ghép chữ không bị ngược nhé con! Bé hãy chọn một chủ đề tuyệt vời dưới đây nào! 🎉
          </p>
        </div>
        {/* Dynamic Bubble Accent */}
        <div className="absolute top-2 right-4 text-emerald-300 pointer-events-none text-2xl">✨</div>
      </motion.div>

      {/* Grid Header */}
      <h3 className="text-lg font-black text-sky-900 tracking-tight uppercase mb-6 font-sans flex items-center gap-2">
        <span>🎨 Hãy Chọn Bài Học Bé Muốn Chơi:</span>
      </h3>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="topic-grid">
        {topics.map((topic, index) => {
          // Calculate completed items under this topic
          const topicItemIds = topic.items.map(item => item.id);
          const completedCount = topic.items.filter(item => 
            userStats.completedIds.includes(item.id)
          ).length;
          const starsEarned = completedCount * 3; // 3 stars max per completed item

          // Choose a physical border bottom color based on the topic profile
          let borderBottomColor = "border-b-orange-600";
          let circleBgColor = "bg-orange-500";
          if (topic.id === 'dong-vat') {
            borderBottomColor = "border-b-teal-700";
            circleBgColor = "bg-teal-600";
          } else if (topic.id === 'do-an') {
            borderBottomColor = "border-b-rose-700";
            circleBgColor = "bg-rose-600";
          } else if (topic.id === 'do-choi') {
            borderBottomColor = "border-b-indigo-700";
            circleBgColor = "bg-indigo-600";
          } else if (topic.id === 'truong-hoc') {
            borderBottomColor = "border-b-blue-700";
            circleBgColor = "bg-blue-600";
          }

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -4 }}
              onClick={() => {
                playSoundEffect('click');
                onSelectTopic(topic.id);
              }}
              className={`bg-white rounded-[36px] overflow-hidden border-2 border-l-2 border-r-2 border-t-2 ${topic.borderColor} ${borderBottomColor} border-b-8 cursor-pointer transition-all flex flex-col justify-between h-full group shadow-xs`}
              id={`topic-card-${topic.id}`}
            >
              {/* Card top banner with gradient */}
              <div className={`bg-gradient-to-r ${topic.color} p-6 flex items-center justify-between border-b-4 border-black/10`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                    {renderIcon(topic.icon)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-widest bg-black/15 px-2.5 py-0.5 rounded-full">
                      Chủ đề {index + 1}
                    </span>
                    <h4 className="text-lg font-black text-white mt-1 group-hover:underline bubble-font">
                      {topic.name}
                    </h4>
                  </div>
                </div>
                <span className="text-4xl">{topic.emoji}</span>
              </div>

              {/* Card content with topic details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-6 font-sans">
                  {topic.description}
                </p>

                {/* Progress Indicators */}
                <div className="bg-slate-50 rounded-2xl p-3 border-2 border-slate-100 flex items-center justify-between">
                  {/* Word count progress */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">TIẾN ĐỘ HỌC</span>
                    <span className="text-xs font-black text-slate-700 font-mono mt-0.5">
                      {completedCount} / {topic.items.length} BÀI XONG
                    </span>
                  </div>

                  {/* Stars indicators */}
                  <div className="flex items-center gap-1 bg-yellow-400 text-white font-black text-xs px-2.5 py-1 rounded-xl border-b-2 border-yellow-600">
                    <LucideIcons.Star className="w-3.5 h-3.5 fill-white-400 animate-pulse" />
                    <span>+{starsEarned} sao</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Dynamic customized Topic creation powered by Gemini */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: topics.length * 0.05 }}
          whileHover={{ scale: 1.02, y: -4 }}
          onClick={() => {
            playSoundEffect('click');
            onOpenCustomLessonCreator();
          }}
          className="bg-purple-50/55 rounded-[36px] p-6 border-2 border-l-2 border-r-2 border-t-2 border-dashed border-purple-300 border-b-8 border-b-purple-400 cursor-pointer transition-all flex flex-col justify-between h-full relative overflow-hidden group shadow-xs"
          id="custom-lesson-card"
        >
          {/* Accent decoration */}
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-purple-200 rounded-full blur-xl opacity-50 pointer-events-none"></div>
          
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-purple-500 rounded-2xl border-b-4 border-purple-700 shadow-sm">
                <LucideIcons.Sparkles className="w-8 h-8 text-white animate-spin-slow" />
              </div>
              <div>
                <span className="text-[10px] font-black text-purple-700 tracking-wider uppercase bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Phép Thuật AI
                </span>
                <h4 className="text-lg font-black text-purple-900 mt-1 bubble-font">
                  Cô Trò Tự Tạo Bài Học
                </h4>
              </div>
            </div>
            
            <p className="text-purple-950 font-semibold text-xs leading-relaxed mb-6 font-sans">
              Bé muốn học về chủ đề gì khác? Khủng long 🦕, vũ trụ 🚀, thế giới biển sâu 🐳? Hãy viết ý kiến của bé và Cô Chích Chòe sẽ tự thiết kế bài học mới toanh ngay lập tức cho con nha!
            </p>
          </div>

          <div className="bg-white rounded-2xl p-3 border-2 border-purple-100 flex items-center justify-between text-purple-700 font-extrabold text-xs group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-700 transition-all">
            <span>Bắt đầu ước mơ của bé... 🦄</span>
            <LucideIcons.ArrowRight className="w-4 h-4" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
