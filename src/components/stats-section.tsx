"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
};

function useCounterAnimation(targetValue: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * targetValue));
    }, 16);

    return () => clearInterval(interval);
  }, [targetValue, duration]);

  return count;
}

function StatCard({ stat, isVisible }: { stat: Stat; isVisible: boolean }) {
  const count = useCounterAnimation(isVisible ? stat.value : 0, 2000);

  const formattedCount = count.toLocaleString("vi-VN");

  return (
    <div className="group flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8 backdrop-blur-sm transition-all duration-500 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-1">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-accent/10 blur-xl transition-all duration-500 group-hover:bg-accent/20" />
        <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-accent/30 bg-surface/60 text-3xl sm:text-4xl group-hover:border-accent/60 transition-colors">
          {stat.icon}
        </div>
      </div>

      <div className="text-center">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-accent via-pastel-4 to-pastel-5 bg-clip-text text-transparent">
          {formattedCount}
          {stat.suffix && <span className="text-lg sm:text-xl">{stat.suffix}</span>}
        </div>
        <p className="mt-2 text-sm sm:text-base text-muted group-hover:text-foreground transition-colors">{stat.label}</p>
      </div>
    </div>
  );
}

export function StatsSection({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-12 sm:py-16 lg:py-20">
      <div className="mb-8 sm:mb-12 animate-fade-in-up">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          🎨 Con số ấn tượng
        </h2>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted">
          Kho hình nền được yêu thích của hàng ngàn users trên toàn thế giới
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
        {stats.map((stat, index) => (
          <div key={index} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-up">
            <StatCard stat={stat} isVisible={isVisible} />
          </div>
        ))}
      </div>
    </section>
  );
}
