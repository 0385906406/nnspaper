"use client";

const BADGES = [
  { text: "4K UHD", icon: "📺" },
  { text: "Chất lượng cao", icon: "✨" },
  { text: "Miễn phí", icon: "🎁" },
];

const STATS = [
  { number: "1000+", label: "Hình nền", delay: "100ms" },
  { number: "50K+", label: "Lượt tải", delay: "200ms" },
  { number: "100%", label: "Miễn phí", delay: "300ms" },
];

export function HomeHero() {
  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      {/* Badges */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {BADGES.map((badge, index) => (
          <div
            key={index}
            className="animate-fade-in-up group flex items-center gap-1.5 rounded-full border border-accent/40 bg-gradient-to-r from-accent/10 to-accent/5 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-accent hover:border-accent/70 hover:from-accent/20 hover:to-accent/10 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <span className="group-hover:scale-110 transition-transform text-sm sm:text-base">
              {badge.icon}
            </span>
            {badge.text}
          </div>
        ))}
      </div>

      {/* Main heading */}
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight text-foreground">
          <span className="block">Hình nền &</span>
          <span className="block bg-gradient-to-r from-accent via-pastel-4 to-pastel-5 bg-clip-text text-transparent">
            Video nền 4K
          </span>
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted leading-relaxed max-w-2xl">
          Khám phá bộ sưu tập hình nền và hình nền động chất lượng cao nhất. Miễn phí 100% cho điện thoại và máy tính, cập nhật mỗi ngày.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 sm:pt-8 border-t border-border/30">
        {STATS.map((stat, index) => (
          <div
            key={index}
            className="animate-fade-in-up group"
            style={{ animationDelay: stat.delay }}
          >
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-accent group-hover:scale-110 transition-transform">
              {stat.number}
            </div>
            <div className="text-xs sm:text-sm text-muted mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
