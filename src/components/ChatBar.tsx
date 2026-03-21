import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getProvider } from '@/services/ai/registry';
import { runPresentationWorkflow } from '@/services/ai/workflow';
import type { WorkflowEvent } from '@/services/ai/workflow';
import type { AIMessage } from '@/services/ai/types';
import type { ChatMessage as ChatMessageType, WorkflowStep } from '@/types';
import { cn } from '@/lib/utils';

export function ChatBar() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStatus = useChatStore((s) => s.setStatus);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent);

  const slidesHtml = usePresentationStore((s) => s.slidesHtml);
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);

  const providerId = useSettingsStore((s) => s.providerId);
  const getActiveProvider = useSettingsStore((s) => s.getActiveProvider);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);

  const isGenerating = status.state === 'generating';

  /** Track workflow steps for the progress UI */
  const workflowStepsRef = useRef<WorkflowStep[]>([
    { id: 'plan', label: 'Plan', status: 'pending' },
    { id: 'design', label: 'Design', status: 'pending' },
    { id: 'qa-validate', label: 'QA', status: 'pending' },
    { id: 'review', label: 'Review', status: 'pending' },
    { id: 'revise', label: 'Polish', status: 'pending' },
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStepStatus = useCallback(
    (stepId: string, stepStatus: WorkflowStep['status']) => {
      workflowStepsRef.current = workflowStepsRef.current.map((s) =>
        s.id === stepId ? { ...s, status: stepStatus } : s,
      );
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;

    if (!hasApiKey()) {
      setShowSettings(true);
      return;
    }

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');

    const chatHistory: AIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Reset workflow step tracking
    workflowStepsRef.current = [
      { id: 'plan', label: 'Plan', status: 'pending' },
      { id: 'design', label: 'Design', status: 'pending' },
      { id: 'qa-validate', label: 'QA', status: 'pending' },
      { id: 'review', label: 'Review', status: 'pending' },
      { id: 'revise', label: 'Polish', status: 'pending' },
    ];

    setStatus({
      state: 'generating',
      startedAt: Date.now(),
      step: 'Starting workflow…',
      pct: 0,
      steps: workflowStepsRef.current,
    });
    setStreamingContent('');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const provider = getProvider(providerId);
      const config = getActiveProvider();

      // Handle workflow events for real-time progress
      const onEvent = (event: WorkflowEvent) => {
        switch (event.type) {
          case 'step-start':
            updateStepStatus(event.stepId, 'active');
            setStatus({
              state: 'generating',
              startedAt: Date.now(),
              step: event.label,
              steps: [...workflowStepsRef.current],
            });
            break;
          case 'step-done':
            updateStepStatus(event.stepId, 'done');
            setStatus({
              state: 'generating',
              startedAt: Date.now(),
              steps: [...workflowStepsRef.current],
            });
            break;
          case 'step-error':
            updateStepStatus(event.stepId, 'error');
            break;
          case 'step-skipped':
            updateStepStatus(event.stepId, 'skipped');
            setStatus({
              state: 'generating',
              startedAt: Date.now(),
              steps: [...workflowStepsRef.current],
            });
            break;
          case 'retry-attempt':
            workflowStepsRef.current = workflowStepsRef.current.map((s) =>
              s.id === event.stepId ? { ...s, retryAttempt: event.attempt } : s,
            );
            setStatus({
              state: 'generating',
              startedAt: Date.now(),
              step: `Retrying ${event.stepId} (${event.attempt}/${event.maxAttempts})`,
              steps: [...workflowStepsRef.current],
            });
            break;
          case 'branch-taken':
            break;
          case 'streaming':
            appendStreamingContent(event.chunk);
            break;
          case 'progress':
            setStatus({
              state: 'generating',
              startedAt: Date.now(),
              step: event.message,
              pct: event.pct,
              steps: [...workflowStepsRef.current],
            });
            break;
        }
      };

      const result = await runPresentationWorkflow({
        input: {
          prompt,
          existingSlidesHtml: slidesHtml || undefined,
          chatHistory,
        },
        llmConfig: {
          provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl ?? '',
          model: config.model,
        },
        onEvent,
        signal: abortController.signal,
      });

      if (result.html) {
        setSlides(result.html);
        if (result.title) setTitle(result.title);
      }

      const reviewNote = result.reviewPassed
        ? ''
        : ' (design fixes were applied)';

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.html
          ? `Done! Generated ${result.slideCount} slides${reviewNote}.`
          : 'Generation completed but no slides were produced.',
        timestamp: Date.now(),
      });
      setStatus({ state: 'idle' });
      setStreamingContent('');
    } catch (err) {
      if (abortController.signal.aborted) {
        setStatus({ state: 'idle' });
        setStreamingContent('');
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Generation cancelled.',
          timestamp: Date.now(),
        });
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Generation failed';
      setStatus({ state: 'error', message });
      setStreamingContent('');

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${message}`,
        timestamp: Date.now(),
      });
    }
  }, [
    input,
    isGenerating,
    hasApiKey,
    setShowSettings,
    addMessage,
    messages,
    slidesHtml,
    setStatus,
    setStreamingContent,
    appendStreamingContent,
    providerId,
    getActiveProvider,
    setSlides,
    setTitle,
    updateStepStatus,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const canSend = input.trim().length > 0 && !isGenerating;

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="relative mx-auto max-w-3xl">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isGenerating
              ? 'Generating\u2026'
              : slidesHtml
                ? 'Describe changes to your slides\u2026'
                : 'What do you want to create?'
          }
          disabled={isGenerating}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 pb-11 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:bg-background disabled:opacity-50"
        />

        <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50">
            {isGenerating ? 'Generating\u2026' : 'Enter to send'}
          </span>
          {isGenerating ? (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
              aria-label="Cancel generation"
            >
              <Square size={14} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-lg transition-colors',
                canSend
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground/40',
              )}
              aria-label="Send message"
            >
              <ArrowUp size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {status.state === 'error' && (
        <p className="mt-2 text-center text-xs text-destructive">
          {status.message}
        </p>
      )}
    </div>
  );
}
