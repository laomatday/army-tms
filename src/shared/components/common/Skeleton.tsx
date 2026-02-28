import React from 'react';

export const DashboardSkeleton = () => {
  return (
    <div className="h-full w-full bg-slate-50 dark:bg-dark-bg flex flex-col relative overflow-hidden transition-colors">
        {/* HEADER AREA */}
        <div className="pt-20 pb-10 px-4 flex flex-col items-center relative z-10">
            {/* Greeting & Name */}
            <div className="flex flex-col items-center mb-6 w-full">
                <div className="h-3 w-24 bg-slate-200 dark:bg-dark-border/50 rounded-full animate-pulse mb-2"></div>
                <div className="h-6 w-32 bg-slate-200 dark:bg-dark-border/50 rounded-full animate-pulse"></div>
            </div>

            {/* Time Display */}
            <div className="h-24 w-64 bg-slate-200 dark:bg-dark-border/50 rounded-xl animate-pulse mb-3"></div>
            
            {/* Date Display */}
            <div className="h-3 w-40 bg-slate-200 dark:bg-dark-border/50 rounded-full animate-pulse mb-8"></div>

            {/* Main Action Button */}
            <div className="relative w-44 h-44 rounded-full bg-slate-200 dark:bg-dark-border/50 animate-pulse ring-4 ring-white dark:ring-dark-bg"></div>
        </div>

        {/* STATS AREA */}
        <div className="flex-1 px-4 pb-32 flex flex-col">
            {/* Stats Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-dark-border/50 rounded-full animate-pulse"></div>
                <div className="h-8 w-32 bg-slate-200 dark:bg-dark-border/50 rounded-full animate-pulse"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-neutral-white dark:bg-dark-surface p-5 rounded-xl border border-slate-100 dark:border-dark-border flex flex-col gap-3 h-32">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-border/50 animate-pulse"></div>
                            <div className="h-6 w-8 bg-slate-100 dark:bg-dark-border/50 rounded animate-pulse"></div>
                        </div>
                        <div className="mt-auto">
                            <div className="h-3 w-20 bg-slate-100 dark:bg-dark-border/50 rounded animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
