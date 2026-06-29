const LoadingScreen = ({ label = "লোড হচ্ছে..." }: { label?: string }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
      </div>
      <p className="text-sm font-medium tracking-wide animate-pulse">{label}</p>
    </div>
  );
};

export default LoadingScreen;
