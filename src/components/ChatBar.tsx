import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getProviderEntry } from '@/services/ai/registry';
import { runPresentationWorkflow } from '@/services/ai/workflow';
import { runDocumentWorkflow } from '@/services/ai/workflow';
import type { WorkflowEvent } from '@/services/ai/workflow';
import type { AIMessage } from '@/services/ai/types';
import type { ChatMessage as ChatMessageType, WorkflowStep } from '@/types';
import type { ProjectDocument } from '@/types/project';
import { commitVersion } from '@/services/storage/versionHistory';
import { sanitizeInnerHtml } from '@/services/html/sanitizer';
import { cn } from '@/lib/utils';

/** Detect if the user wants to create/edit a document or presentation */
function detectWorkflowType(
  prompt: string,
  activeDocType: 'document' | 'presentation' | undefined,
): 'document' | 'presentation' {
  const p = prompt.toLowerCase();

  // Explicit presentation keywords
  const presentationKeywords = [
    'slide', 'presentation', 'deck', 'slideshow',
    'pitch', 'keynote', 'powerpoint',
  ];
  if (presentationKeywords.some((k) => p.includes(k))) return 'presentation';

  // Explicit document keywords
  const documentKeywords = [
    'document', 'doc', 'article', 'report', 'essay', 'note',
    'wiki', 'readme', 'page', 'write', 'draft', 'blog',
  ];
  if (documentKeywords.some((k) => p.includes(k))) return 'document';

  // If there's an active document, use its type for edits
  if (activeDocType) return activeDocType;

  // Default: presentation (preserves existing behavior)
  return 'presentation';
}

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

  // Project store
  const project = useProjectStore((s) => s.project);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const addDocument = useProjectStore((s) => s.addDocument);
  const updateDocument = useProjectStore((s) => s.updateDocument);

  const providerId = useSettingsStore((s) => s.providerId);
  const getActiveProvider = useSettingsStore((s) => s.getActiveProvider);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);

  const isGenerating = status.state === 'generating';

  const workflowStepsRef = useRef<WorkflowStep[]>([]);
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

    // Detect workflow type
    const workflowType = detectWorkflowType(prompt, activeDocument?.type);
    const isEdit = !!activeDocument?.contentHtml;

    if (workflowType === 'presentation') {
      // ─── Presentation workflow ─────────────────────────────────
      const isEditFlow = isEdit && activeDocument?.type === 'presentation';

      workflowStepsRef.current = isEditFlow
        ? [
            { id: 'plan', label: 'Plan', status: 'pending' },
            { id: 'targeted-design', label: 'Design', status: 'pending' },
            { id: 'evaluate', label: 'Evaluate', status: 'pending' },
            { id: 'finalize', label: 'Finalize', status: 'pending' },
          ]
        : [
            { id: 'plan', label: 'Plan', status: 'pending' },
            { id: 'design', label: 'Design', status: 'pending' },
            { id: 'evaluate', label: 'Evaluate', status: 'pending' },
            { id: 'finalize', label: 'Finalize', status: 'pending' },
          ];

      setStatus({
        state: 'generating',
        startedAt: Date.now(),
        step: 'Starting…',
        pct: 0,
        steps: workflowStepsRef.current,
      });
      setStreamingContent('');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const providerEntry = getProviderEntry(providerId);
        const config = getActiveProvider();

        const onEvent = (event: WorkflowEvent) => {
          switch (event.type) {
            case 'step-start':
              updateStepStatus(event.stepId, 'active');
              setStatus({ state: 'generating', startedAt: Date.now(), step: event.label, steps: [...workflowStepsRef.current] });
              break;
            case 'step-done':
              updateStepStatus(event.stepId, 'done');
              setStatus({ state: 'generating', startedAt: Date.now(), steps: [...workflowStepsRef.current] });
              break;
            case 'step-error':
              updateStepStatus(event.stepId, 'error');
              break;
            case 'step-skipped':
              updateStepStatus(event.stepId, 'skipped');
              setStatus({ state: 'generating', startedAt: Date.now(), steps: [...workflowStepsRef.current] });
              break;
            case 'retry-attempt':
              workflowStepsRef.current = workflowStepsRef.current.map((s) =>
                s.id === event.stepId ? { ...s, retryAttempt: event.attempt } : s,
              );
              setStatus({ state: 'generating', startedAt: Date.now(), step: `Retrying ${event.stepId}`, steps: [...workflowStepsRef.current] });
              break;
            case 'streaming':
              appendStreamingContent(event.chunk);
              break;
            case 'draft-complete':
              if (event.html) setSlides(event.html);
              setStatus({ state: 'generating', startedAt: Date.now(), step: 'Running final QA checks…', pct: 72, steps: [...workflowStepsRef.current] });
              break;
            case 'progress':
              setStatus({ state: 'generating', startedAt: Date.now(), step: event.message, pct: event.pct, steps: [...workflowStepsRef.current] });
              break;
          }
        };

        const existingSlides = isEditFlow ? activeDocument?.contentHtml : undefined;

        const result = await runPresentationWorkflow({
          input: {
            prompt,
            existingSlidesHtml: existingSlides,
            chatHistory,
          },
          llmConfig: {
            providerEntry,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl ?? '',
            model: config.model,
          },
          onEvent,
          signal: abortController.signal,
        });

        if (result.html) {
          const sanitized = sanitizeInnerHtml(result.html);

          if (activeDocument?.type === 'presentation') {
            // Update existing presentation document
            updateDocument(activeDocument.id, {
              contentHtml: sanitized,
              title: result.title || activeDocument.title,
              slideCount: result.slideCount,
            });
          } else {
            // Create a new presentation document
            const newDoc: ProjectDocument = {
              id: crypto.randomUUID(),
              title: result.title || 'Presentation',
              type: 'presentation',
              contentHtml: sanitized,
              themeCss: '',
              slideCount: result.slideCount,
              order: project.documents.length,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            addDocument(newDoc);
          }

          if (result.title) setTitle(result.title);
          setSlides(sanitized);
        }

        const reviewNote = result.reviewPassed ? '' : ' (QA flagged issues)';
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.html
            ? `✅ Generated ${result.slideCount} slides${reviewNote}.`
            : 'Generation completed but no slides were produced.',
          timestamp: Date.now(),
        });

        // Auto-commit version after generation
        const commitMsg = `Generated presentation: ${prompt.slice(0, 60)}`;
        const updatedProject = useProjectStore.getState().project;
        commitVersion(updatedProject, commitMsg).catch(console.warn);

        setStatus({ state: 'idle' });
        setStreamingContent('');
      } catch (err) {
        if (abortController.signal.aborted) {
          setStatus({ state: 'idle' });
          setStreamingContent('');
          addMessage({ id: crypto.randomUUID(), role: 'assistant', content: 'Generation cancelled.', timestamp: Date.now() });
          return;
        }
        const message = err instanceof Error ? err.message : 'Generation failed';
        setStatus({ state: 'error', message });
        setStreamingContent('');
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now() });
      }
    } else {
      // ─── Document workflow ─────────────────────────────────────
      workflowStepsRef.current = [
        { id: 'generate', label: 'Writing', status: 'pending' },
      ];

      setStatus({ state: 'generating', startedAt: Date.now(), step: 'Starting…', pct: 0, steps: workflowStepsRef.current });
      setStreamingContent('');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const providerEntry = getProviderEntry(providerId);
        const config = getActiveProvider();

        const onEvent = (event: WorkflowEvent) => {
          switch (event.type) {
            case 'step-start':
              updateStepStatus(event.stepId, 'active');
              setStatus({ state: 'generating', startedAt: Date.now(), step: event.label, steps: [...workflowStepsRef.current] });
              break;
            case 'step-done':
              updateStepStatus(event.stepId, 'done');
              setStatus({ state: 'generating', startedAt: Date.now(), steps: [...workflowStepsRef.current] });
              break;
            case 'streaming':
              appendStreamingContent(event.chunk);
              break;
            case 'progress':
              setStatus({ state: 'generating', startedAt: Date.now(), step: event.message, pct: event.pct, steps: [...workflowStepsRef.current] });
              break;
            case 'step-error':
              updateStepStatus(event.stepId, 'error');
              break;
          }
        };

        const existingDoc = isEdit && activeDocument?.type === 'document'
          ? activeDocument.contentHtml
          : undefined;

        const result = await runDocumentWorkflow({
          input: {
            prompt,
            existingHtml: existingDoc,
            chatHistory,
          },
          llmConfig: {
            providerEntry,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl ?? '',
            model: config.model,
          },
          onEvent,
          signal: abortController.signal,
        });

        if (result.html) {
          if (activeDocument?.type === 'document') {
            updateDocument(activeDocument.id, {
              contentHtml: result.html,
              title: result.title || activeDocument.title,
            });
          } else {
            const newDoc: ProjectDocument = {
              id: crypto.randomUUID(),
              title: result.title || 'Document',
              type: 'document',
              contentHtml: result.html,
              themeCss: '',
              slideCount: 0,
              order: project.documents.length,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            addDocument(newDoc);
          }
        }

        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.html ? `✅ Created document: "${result.title}"` : 'Document created.',
          timestamp: Date.now(),
        });

        // Auto-commit version
        const commitMsg = `Created document: ${prompt.slice(0, 60)}`;
        const updatedProject = useProjectStore.getState().project;
        commitVersion(updatedProject, commitMsg).catch(console.warn);

        setStatus({ state: 'idle' });
        setStreamingContent('');
      } catch (err) {
        if (abortController.signal.aborted) {
          setStatus({ state: 'idle' });
          setStreamingContent('');
          addMessage({ id: crypto.randomUUID(), role: 'assistant', content: 'Generation cancelled.', timestamp: Date.now() });
          return;
        }
        const message = err instanceof Error ? err.message : 'Generation failed';
        setStatus({ state: 'error', message });
        setStreamingContent('');
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now() });
      }
    }
  }, [
    input, isGenerating, hasApiKey, setShowSettings, addMessage, messages,
    slidesHtml, setStatus, setStreamingContent, appendStreamingContent,
    providerId, getActiveProvider, setSlides, setTitle, updateStepStatus,
    activeDocument, addDocument, updateDocument, project,
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

  const placeholder = isGenerating
    ? 'Generating\u2026'
    : activeDocument
      ? `Update ${activeDocument.type === 'presentation' ? 'slides' : 'document'}\u2026`
      : 'What would you like to create?';

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="relative mx-auto max-w-3xl">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 pb-11 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:bg-background disabled:opacity-50"
        />
        <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50">
            {isGenerating ? 'Generating\u2026' : 'Enter to send · Shift+Enter for new line'}
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
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm'
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
        <p className="mt-2 text-center text-xs text-destructive">{status.message}</p>
      )}
    </div>
  );
}
