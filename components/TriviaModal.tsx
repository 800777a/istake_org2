
import React, { useState } from 'react';
import { Registration } from '../types';
import { saveTriviaScore } from '../services/sheetService';
import { X, Trophy, Brain, Music, Play, Pause, BookOpen, CheckCircle, XCircle, Award } from 'lucide-react';

interface TriviaModalProps {
  registration: Registration;
  onClose: () => void;
}

const questions = [
    { q: "嘉義支聯會目前所屬的聖殿區是？", options: ["台北聖殿", "高雄聖殿", "台中聖殿", "台南聖殿"], ans: 0 },
    { q: "進入聖殿執行教儀必須持有？", options: ["身分證", "聖殿推薦書", "經文", "奉獻收據"], ans: 1 },
    { q: "哪一位先知曾在嘉德蘭聖殿顯現並交托權鑰？", options: ["摩羅乃", "以利亞", "尼腓", "阿爾瑪"], ans: 1 },
    { q: "耶穌基督後期聖徒教會的第一座聖殿是？", options: ["鹽湖城聖殿", "納府聖殿", "嘉德蘭聖殿", "聖喬治聖殿"], ans: 2 },
    { q: "代替死者洗禮的教儀，通常在聖殿的哪個位置進行？", options: ["高荣室", "受洗池 (通常在地下)", "印證室", "恩道門室"], ans: 1 },
];

const hymns = [
    { title: "山頭上的聖殿", duration: "3:15" },
    { title: "聖靈請指引", duration: "2:45" },
    { title: "我是神的孩子", duration: "2:30" },
    { title: "感謝神賜我們先知", duration: "3:00" },
];

const TriviaModal: React.FC<TriviaModalProps> = ({ registration, onClose }) => {
  const [activeTab, setActiveTab] = useState<'trivia' | 'hymn'>('trivia');
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Hymn Player State
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const handleAnswer = (idx: number) => {
      setSelectedAns(idx);
      setShowResult(true);
      if (idx === questions[currentQ].ans) {
          setScore(score + 20);
      }
      setTimeout(() => {
          if (currentQ < questions.length - 1) {
              setCurrentQ(currentQ + 1);
              setSelectedAns(null);
              setShowResult(false);
          } else {
              setFinished(true);
              // Save high score if better
              const currentHigh = registration.trivia_score || 0;
              if (score + (idx === questions[currentQ].ans ? 20 : 0) > currentHigh) {
                  saveTriviaScore(registration.reg_id, score + (idx === questions[currentQ].ans ? 20 : 0));
              }
          }
      }, 1500);
  };

  const togglePlay = (idx: number) => {
      if (playingIndex === idx) setPlayingIndex(null);
      else setPlayingIndex(idx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-[500px] max-w-full h-[600px] rounded shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-2xl font-bold flex items-center">
                    <Brain className="w-6 h-6 mr-2" /> 靈性學習中心
                </h2>
                <p className="text-teal-100 text-sm mt-1">互動 • 學習 • 準備</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2"><X className="w-6 h-6"/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
            <button 
                onClick={() => setActiveTab('trivia')}
                className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === 'trivia' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Trophy className="inline w-4 h-4 mr-1" /> 聖殿挑戰
            </button>
            <button 
                onClick={() => setActiveTab('hymn')}
                className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === 'hymn' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Music className="inline w-4 h-4 mr-1" /> 詩歌播放
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {activeTab === 'trivia' ? (
                !finished ? (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-sm font-bold text-gray-400">Question {currentQ + 1}/{questions.length}</span>
                            <span className="text-sm font-bold text-teal-600">Score: {score}</span>
                        </div>
                        
                        <div className="bg-white p-6 rounded shadow-sm mb-6 flex-1 flex items-center justify-center text-center">
                            <h3 className="text-xl font-bold text-gray-800 leading-relaxed">
                                {questions[currentQ].q}
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {questions[currentQ].options.map((opt, i) => {
                                let btnClass = "bg-white border-2 border-gray-200 text-gray-700 hover:border-teal-400";
                                if (showResult) {
                                    if (i === questions[currentQ].ans) btnClass = "bg-green-100 border-green-500 text-green-800";
                                    else if (i === selectedAns) btnClass = "bg-red-100 border-red-500 text-red-800";
                                    else btnClass = "bg-gray-100 border-gray-200 text-gray-400";
                                }

                                return (
                                    <button 
                                        key={i}
                                        onClick={() => !showResult && handleAnswer(i)}
                                        disabled={showResult}
                                        className={`w-full py-4 rounded font-bold transition-all transform active:scale-95 ${btnClass}`}
                                    >
                                        {opt}
                                        {showResult && i === questions[currentQ].ans && <CheckCircle className="inline ml-2 w-5 h-5"/>}
                                        {showResult && i === selectedAns && i !== questions[currentQ].ans && <XCircle className="inline ml-2 w-5 h-5"/>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center h-full flex flex-col justify-center items-center">
                        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                            <Trophy className="w-12 h-12 text-yellow-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">挑戰完成！</h3>
                        <p className="text-gray-500 mb-6">您的得分</p>
                        <div className="text-6xl font-black text-teal-600 mb-8">{score}</div>
                        {score >= 80 && (
                            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded font-bold mb-6 flex items-center">
                                <Award className="w-5 h-5 mr-2" /> 獲得「知識守護者」徽章！
                            </div>
                        )}
                        <button 
                            onClick={() => { setFinished(false); setCurrentQ(0); setScore(0); }}
                            className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-700"
                        >
                            再玩一次
                        </button>
                    </div>
                )
            ) : (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-4">
                        <h4 className="font-bold text-blue-800 flex items-center mb-2">
                            <BookOpen className="w-4 h-4 mr-2" /> 經文分享
                        </h4>
                        <p className="text-sm text-blue-900 italic">
                            "你們要站在聖地，不要動搖，直到主的日子來臨。" - 教義和聖約 87:8
                        </p>
                    </div>

                    <h3 className="font-bold text-gray-700 mb-2 ml-1">精選詩歌</h3>
                    {hymns.map((h, i) => (
                        <div key={i} className="bg-white p-4 rounded shadow-sm flex items-center justify-between group hover:border-teal-300 border border-transparent transition-all">
                            <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors ${playingIndex === i ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Music className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800">{h.title}</div>
                                    <div className="text-xs text-gray-400">{h.duration} • 聖殿精選</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => togglePlay(i)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${playingIndex === i ? 'bg-red-100 text-red-500' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
                            >
                                {playingIndex === i ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                            </button>
                        </div>
                    ))}
                    {playingIndex !== null && (
                        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center text-sm z-10 animate-bounce-in">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                            正在播放: {hymns[playingIndex].title} (Mock)
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TriviaModal;
