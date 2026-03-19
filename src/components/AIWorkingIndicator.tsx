export function AIWorkingIndicator() {
  return (
    <div className="px-4 py-3 bg-muted/40 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="mb-1 text-xs text-muted-foreground">Aura</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span
              className="size-1 rounded-full bg-foreground/40 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="size-1 rounded-full bg-foreground/40 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="size-1 rounded-full bg-foreground/40 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Generating slides&hellip;
          </span>
        </div>
      </div>
    </div>
  );
}
