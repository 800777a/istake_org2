
import React from 'react';
import { Lock, Unlock, RotateCcw, Smartphone } from 'lucide-react';

interface SharedOperationsProps {
    isLockedPayment: boolean;
    isLockedTo: boolean;
    isLockedBack: boolean;
    onToggleLockPayment: () => void;
    onToggleLockTo: () => void;
    onToggleLockBack: () => void;
    onResetTo: () => void;
    onResetBack: () => void;
    onMobileMode: () => void;
    className?: string;
    titleClassName?: string;
}

const SharedOperations: React.FC<SharedOperationsProps> = ({
    isLockedPayment,
    isLockedTo,
    isLockedBack,
    onToggleLockPayment,
    onToggleLockTo,
    onToggleLockBack,
    onResetTo,
    onResetBack,
    onMobileMode,
    className,
    titleClassName
}) => {
    return (
        <div className={`p-4 rounded shadow-sm border mb-6 ${className || 'bg-white'}`}>
            <h3 className={`font-bold mb-3 text-sm ${titleClassName || 'text-gray-700'}`}>操作區</h3>
            <div className="flex flex-wrap gap-2">
                 <button onClick={onToggleLockPayment} className={`flex items-center px-3 py-2 rounded text-xs font-bold transition-colors ${isLockedPayment ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{isLockedPayment ? <Lock className="w-4 h-4 mr-1"/> : <Unlock className="w-4 h-4 mr-1"/>} 鎖定付款</button>
                 <button onClick={onResetTo} className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-xs font-bold hover:bg-gray-300 flex items-center"><RotateCcw className="w-4 h-4 mr-1"/> 去程重置</button>
                 <button onClick={onResetBack} className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-xs font-bold hover:bg-gray-300 flex items-center"><RotateCcw className="w-4 h-4 mr-1"/> 回程重置</button>
                 <button onClick={onToggleLockTo} className={`flex items-center px-3 py-2 rounded text-xs font-bold transition-colors ${isLockedTo ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{isLockedTo ? <Lock className="w-4 h-4 mr-1"/> : <Unlock className="w-4 h-4 mr-1"/>} 鎖定去程</button>
                 <button onClick={onToggleLockBack} className={`flex items-center px-3 py-2 rounded text-xs font-bold transition-colors ${isLockedBack ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{isLockedBack ? <Lock className="w-4 h-4 mr-1"/> : <Unlock className="w-4 h-4 mr-1"/>} 鎖定回程</button>
                 <button onClick={onMobileMode} className="bg-indigo-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-indigo-700 flex items-center"><Smartphone className="w-4 h-4 mr-1" /> 行動點名</button>
            </div>
        </div>
    );
};

export default SharedOperations;
