
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string | null;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    const getColors = () => {
        switch (type) {
            case 'success': return 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 border-amber-500 text-amber-950';
            case 'error': return 'bg-red-600 border-red-400 text-white';
            case 'info': return 'bg-blue-600 border-blue-400 text-white';
            default: return 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 border-amber-500 text-amber-950';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-amber-900" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-white" />;
            default: return <Info className="w-5 h-5 text-white" />;
        }
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div 
                    initial={{ opacity: 0, y: 50, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                    className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[999] ${getColors()} px-6 py-3 rounded font-bold shadow-2xl border-2 flex items-center gap-3 cursor-pointer min-w-[300px] justify-between`}
                    onClick={onClose}
                >
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <span>{message}</span>
                    </div>
                    <X className="w-4 h-4 opacity-70" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
