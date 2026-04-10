import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { WorkflowStep } from '@/types';

const STEP_ICONS: Record<string, string> = {
  plan: '🧠',
  design: '🎨',
  'targeted-design': '🎯',
  generate: '📝',
  qa: '🔬',
  'qa-validate': '🔬',
  evaluate: '📊',
  review: '🔍',
  revise: '✨',
  finalize: '✅',
};

function StepBadge({ step }: { step: WorkflowStep }) {
  const icon = STEP_ICONS[step.id] ?? '⚡';
  const isActive = step.status === 'active';
  const isDone = step.status === 'done';
  const isError = step.status === 'error';
  const isSkipped = step.status === 'skipped';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300 ${
        isActive
          ? 'bg-foreground/10 text-foreground ring-1 ring-foreground/20'
          : isDone
            ? 'bg-emerald-500/10 text-emerald-400'
            : isError
              ? 'bg-red-500/10 text-red-400'
              : isSkipped
                ? 'bg-muted text-muted-foreground/40 line-through'
                : 'text-muted-foreground/50'
      }`}
    >
      <span>{icon}</span>
      <span>{step.label}</span>
      {step.retryAttempt && step.retryAttempt > 0 && (
        <span className="text-amber-400 text-[9px]">(retry {step.retryAttempt})</span>
      )}
      {isDone && <span className="text-emerald-400">✓</span>}
      {isSkipped && <span className="text-muted-foreground/40">—</span>}
      {isActive && (
        <span className="flex gap-0.5">
          <span className="size-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="size-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
        </span>
      )}
    </div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (elapsed < 1) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <span className="text-[10px] tabular-nums text-muted-foreground/60">
      {display}
    </span>
  );
}

export function AIWorkingIndicator() {
  const status = useChatStore((s) => s.status);

  if (status.state !== 'generating') return null;

  const steps = status.steps;
  const currentStep = status.step ?? 'Working…';
  const pct = status.pct ?? 0;

  return (
    <div className="px-4 py-3 bg-muted/40 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground/80">{currentStep}</p>
          <div className="flex items-center gap-2">
            <ElapsedTime startedAt={status.startedAt} />
            {pct > 0 && (
              <span className="text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {pct > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Step badges */}
        {steps && steps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {steps.map((step) => (
              <StepBadge key={step.id} step={step} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
