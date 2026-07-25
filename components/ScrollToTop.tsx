import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const ScrollNavigator: React.FC = () => {
    const isDragging = useRef(false);
    
    const getScrollContainers = () => {
        const containers = Array.from(document.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-auto, .dense-table-wrapper, [style*="overflow: auto"], [style*="overflow-x: auto"]'));
        return [
            document.getElementById('public-scroll-container'),
            document.getElementById('admin-scroll-container'),
            document.getElementById('engineer-scroll-container'),
            document.documentElement,
            document.body,
            ...containers,
            window
        ].filter(Boolean) as (HTMLElement | Window)[];
    };

    const scrollToTop = (e: React.MouseEvent) => {
        if (isDragging.current) return;
        e.stopPropagation();
        
        getScrollContainers().forEach(container => {
            if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToBottom = (e: React.MouseEvent) => {
        if (isDragging.current) return;
        e.stopPropagation();
        
        getScrollContainers().forEach(container => {
            if (container) {
                const target = container === window ? document.documentElement : (container as HTMLElement);
                container.scrollTo({ 
                    top: target.scrollHeight, 
                    behavior: 'smooth' 
                });
            }
        });
    };

    const scrollToLeft = (e: React.MouseEvent) => {
        if (isDragging.current) return;
        e.preventDefault();
        e.stopPropagation();
        
        const containers = getScrollContainers();
        containers.forEach(container => {
            if (container) {
                container.scrollTo({ left: 0, behavior: 'smooth' });
            }
        });
        window.scrollTo({ left: 0, behavior: 'smooth' });
    };

    const scrollToRight = (e: React.MouseEvent) => {
        if (isDragging.current) return;
        e.preventDefault();
        e.stopPropagation();
        
        const containers = getScrollContainers();
        containers.forEach(container => {
            if (container) {
                const target = container === window ? document.documentElement : (container as HTMLElement);
                const maxScroll = target.scrollWidth - (container === window ? window.innerWidth : (container as HTMLElement).clientWidth);
                
                if (maxScroll > 0) {
                    container.scrollTo({ 
                        left: target.scrollWidth, 
                        behavior: 'smooth' 
                    });
                }
            }
        });
        
        // Also scroll the main document
        window.scrollTo({ left: document.documentElement.scrollWidth, behavior: 'smooth' });
    };

    return (
        <AnimatePresence>
            <motion.div
                drag
                dragMomentum={false}
                dragTransition={{ power: 0, timeConstant: 200 }}
                onDragStart={() => { isDragging.current = true; }}
                onDragEnd={() => { 
                    setTimeout(() => { isDragging.current = false; }, 150);
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed bottom-8 right-8 z-[200] cursor-grab active:cursor-grabbing touch-none"
            >
                <div className="relative w-12 h-12 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] bg-white/95 backdrop-blur-lg text-gray-800 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] grid grid-cols-3 grid-rows-3 border border-gray-300/80 overflow-hidden group">
                    {/* Row 1 */}
                    <div className="border-r border-b border-gray-200/50" />
                    <button
                        onClick={(e) => scrollToTop(e)}
                        className="w-full h-full flex items-center justify-center hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors border-b border-gray-200/50 pointer-events-auto"
                        title="回到頂部"
                    >
                        <ChevronUp className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                    </button>
                    <div className="border-l border-b border-gray-200/50" />
                    
                    {/* Row 2 */}
                    <button
                        onClick={(e) => scrollToLeft(e)}
                        className="w-full h-full flex items-center justify-center hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors border-r border-gray-200/50 pointer-events-auto"
                        title="移至最左"
                    >
                        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                    </button>
                    
                    <div className="w-full h-full flex items-center justify-center bg-indigo-500/5">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 bg-indigo-600/40 rounded-full animate-pulse" />
                    </div>

                    <button
                        onClick={(e) => scrollToRight(e)}
                        className="w-full h-full flex items-center justify-center hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors border-l border-gray-200/50 pointer-events-auto"
                        title="移至最右"
                    >
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                    </button>

                    {/* Row 3 */}
                    <div className="border-r border-t border-gray-200/50" />
                    <button
                        onClick={(e) => scrollToBottom(e)}
                        className="w-full h-full flex items-center justify-center hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors border-t border-gray-200/50 pointer-events-auto"
                        title="前往底部"
                    >
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                    </button>
                    <div className="border-l border-t border-gray-200/50" />
                </div>

                {/* Drag Hint */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest border border-white/10 shadow-xl">
                    可拖曳移動
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ScrollNavigator;
