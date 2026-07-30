
import React, { useState } from 'react';
import { Registration, Ancestor, OrdinanceItem } from '../types';
import { addAncestor, removeAncestor, updateAncestorStatus } from '../services/sheetService';
import { X, Plus, Trash2, Printer, CheckCircle, Circle, QrCode } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface AncestorManagerModalProps {
  registration: Registration;
  onClose: () => void;
  onRefresh: () => void;
}

const AncestorManagerModal: React.FC<AncestorManagerModalProps> = ({ registration, onClose, onRefresh }) => {
  const [ancestors, setAncestors] = useState<Ancestor[]>(registration.ancestors || []);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female'>('Male');
  const [selectedOrds, setSelectedOrds] = useState<Set<OrdinanceItem>>(new Set());
  const [viewCard, setViewCard] = useState<Ancestor | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const toggleOrd = (item: OrdinanceItem) => {
      const next = new Set(selectedOrds);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      setSelectedOrds(next);
  };

  const handleAdd = () => {
      if (!newName) return;
      const newAncestor: Ancestor = {
          id: `ANC-${Date.now()}`,
          name: newName,
          gender: newGender,
          ordinances: Array.from(selectedOrds),
          status: 'ready',
          idNumber: Math.random().toString(36).substring(2, 9).toUpperCase()
      };
      
      addAncestor(registration.reg_id, newAncestor);
      setAncestors([...ancestors, newAncestor]);
      setNewName('');
      setSelectedOrds(new Set());
      onRefresh();
  };

  const handleRemove = (id: string) => {
      setConfirmConfig({
          isOpen: true,
          title: '刪除確認',
          message: '確定刪除此位先祖?',
          onConfirm: () => {
              removeAncestor(registration.reg_id, id);
              setAncestors(ancestors.filter(a => a.id !== id));
              onRefresh();
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleStatusChange = (ancestor: Ancestor) => {
      const nextStatus = ancestor.status === 'ready' ? 'printed' : ancestor.status === 'printed' ? 'completed' : 'ready';
      updateAncestorStatus(registration.reg_id, ancestor.id, nextStatus);
      setAncestors(ancestors.map(a => a.id === ancestor.id ? { ...a, status: nextStatus } : a));
      onRefresh();
  };

  // Ordinance Code Map
  const ordCodes: Record<string, string> = {
      [OrdinanceItem.BAPTISM]: 'B',
      [OrdinanceItem.CONFIRMATION]: 'C',
      [OrdinanceItem.INITIATORY]: 'I',
      [OrdinanceItem.ENDOWMENT]: 'E',
      [OrdinanceItem.SEALING]: 'SP',
      [OrdinanceItem.OBSERVER]: 'O',
      [OrdinanceItem.NONE]: 'N',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-[800px] max-w-full h-[80vh] rounded shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold flex items-center">
                <span className="text-2xl mr-2">🏛️</span> 家譜管家 (Family History Manager)
            </h2>
            <button onClick={onClose} className="hover:bg-slate-700 rounded-full p-1"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: List & Form */}
            <div className="flex-1 p-6 overflow-y-auto border-r bg-gray-50">
                
                {/* Add Form */}
                <div className="bg-white p-4 rounded shadow-sm mb-6 border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center text-sm uppercase tracking-wider">
                        <Plus className="w-4 h-4 mr-1" /> 新增教儀名單
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="先祖姓名" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 border p-2 rounded text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                            />
                            <select 
                                value={newGender} 
                                onChange={e => setNewGender(e.target.value as any)}
                                className="border p-2 rounded text-sm bg-white"
                            >
                                <option value="Male">男</option>
                                <option value="Female">女</option>
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[OrdinanceItem.BAPTISM, OrdinanceItem.CONFIRMATION, OrdinanceItem.INITIATORY, OrdinanceItem.ENDOWMENT, OrdinanceItem.SEALING].map(ord => (
                                <button 
                                    key={ord}
                                    onClick={() => toggleOrd(ord)}
                                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${selectedOrds.has(ord) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                                >
                                    {ord}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={handleAdd}
                            disabled={!newName}
                            className="w-full bg-slate-700 text-white py-2 rounded font-bold hover:bg-slate-800 disabled:opacity-50 text-sm"
                        >
                            加入名單
                        </button>
                    </div>
                </div>

                {/* List */}
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider">我的先祖名單 ({ancestors.length})</h3>
                <div className="space-y-2">
                    {ancestors.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">尚無資料，請從上方新增</div>
                    ) : (
                        ancestors.map(anc => (
                            <div key={anc.id} className="bg-white p-3 rounded border shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                                <div className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold text-xs ${anc.gender === 'Male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                        {anc.gender === 'Male' ? 'M' : 'F'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{anc.name}</div>
                                        <div className="text-xs text-gray-500 flex gap-1 mt-0.5">
                                            {anc.ordinances.map(o => (
                                                <span key={o} className="bg-gray-100 px-1 rounded">{ordCodes[o]}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => handleStatusChange(anc)}
                                        className={`p-1.5 rounded-full ${anc.status === 'completed' ? 'bg-green-100 text-green-600' : anc.status === 'printed' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}
                                        title={`狀態: ${anc.status}`}
                                    >
                                        {anc.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : anc.status === 'printed' ? <Printer className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => setViewCard(anc)}
                                        className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        title="檢視教儀卡"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleRemove(anc.id)}
                                        className="p-1.5 rounded-full bg-red-50 text-red-400 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Card Preview */}
            <div className="w-full md:w-[350px] bg-gray-200 p-6 flex flex-col items-center justify-center shrink-0 border-l relative">
                {viewCard ? (
                    <div className={`w-[280px] h-[400px] rounded shadow-xl relative overflow-hidden flex flex-col border-4 transition-transform duration-500 transform hover:scale-105 ${viewCard.gender === 'Male' ? 'bg-blue-50 border-blue-200' : 'bg-pink-50 border-pink-200'}`}>
                        {/* Card Header */}
                        <div className={`h-4 w-full ${viewCard.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="text-center border-b pb-2 mb-4 border-gray-300">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Family Ordinance Request</h4>
                                <div className="text-2xl font-serif font-bold text-gray-800 mt-1">{viewCard.name}</div>
                                <div className="text-xs font-mono text-gray-400 mt-1">ID: {viewCard.idNumber}</div>
                            </div>

                            <div className="space-y-3 flex-1">
                                {['B', 'C', 'I', 'E', 'SP', 'SS'].map(code => {
                                    // Map code back to enum for checking
                                    let active = false;
                                    if (code === 'B' && viewCard.ordinances.includes(OrdinanceItem.BAPTISM)) active = true;
                                    if (code === 'C' && viewCard.ordinances.includes(OrdinanceItem.CONFIRMATION)) active = true;
                                    if (code === 'I' && viewCard.ordinances.includes(OrdinanceItem.INITIATORY)) active = true;
                                    if (code === 'E' && viewCard.ordinances.includes(OrdinanceItem.ENDOWMENT)) active = true;
                                    if (code === 'SP' && viewCard.ordinances.includes(OrdinanceItem.SEALING)) active = true;

                                    return (
                                        <div key={code} className={`flex items-center justify-between border-b border-dashed border-gray-300 pb-1 ${active ? 'opacity-100' : 'opacity-30'}`}>
                                            <span className="font-bold text-sm w-8">{code}</span>
                                            <div className={`w-4 h-4 border border-gray-400 rounded-sm ${active ? 'bg-white' : 'bg-gray-200'}`}></div>
                                            <span className="text-[10px] text-gray-400">Date: __________</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 pt-2 border-t border-gray-300 text-center">
                                <div className="bg-white p-2 inline-block rounded">
                                    <QrCode className="w-16 h-16 text-gray-800" />
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">FOR TEMPLE USE ONLY</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <QrCode className="w-8 h-8 text-white" />
                        </div>
                        <p>點擊列表中的 QR 圖示<br/>以預覽教儀卡</p>
                    </div>
                )}
                
                {viewCard && (
                    <button 
                        onClick={() => window.print()}
                        className="mt-6 bg-white text-gray-700 px-4 py-2 rounded-full shadow hover:bg-gray-50 text-sm font-bold flex items-center"
                    >
                        <Printer className="w-4 h-4 mr-2" /> 列印 / 下載
                    </button>
                )}
            </div>
            <ConfirmDialog 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
      </div>
      <style>{`
        @media print {
            body * { visibility: hidden; }
            .fixed { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; z-index: 9999; }
            .fixed * { visibility: visible; }
            /* Hide UI elements */
            .fixed button, .fixed .overflow-y-auto { display: none; }
            /* Show card only */
            .fixed .w-\\[350px\\] { width: 100%; height: 100%; position: absolute; left: 0; top: 0; background: white; border: none; align-items: center; justify-content: center; display: flex; }
            .fixed .w-\\[280px\\] { transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
};

export default AncestorManagerModal;
