import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, Paperclip, Sparkles, Square, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { WorkflowEvent } from '@/services/ai/workflow';
import type { AIMessage } from '@/services/ai/types';
import type { ChatMessage as ChatMessageType, FileAttachment, WorkflowStep } from '@/types';
import type { ProjectDocument } from '@/types/project';
import { commitVersion } from '@/services/storage/versionHistory';
import { readFileAsAttachment, buildAttachmentContext } from '@/lib/fileAttachment';
import { detectWorkflowType } from '@/lib/workflowType';
import { cn } from '@/lib/utils';
import { extractChartSpecsFromHtml } from '@/services/charts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DOCUMENT_STYLE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'executive', label: 'Executive' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'infographic', label: 'Infographic' },
  { value: 'playbook', label: 'Playbook' },
  { value: 'research', label: 'Research' },
  { value: 'proposal', label: 'Proposal' },
] as const;

function progressWidthClass(pct?: number): string {
  if (!pct || pct <= 0) return 'w-0';
  if (pct >= 100) return 'w-full';
  if (pct <= 5) return 'w-[5%]';
  if (pct <= 10) return 'w-[10%]';
  if (pct <= 20) return 'w-[20%]';
  if (pct <= 30) return 'w-[30%]';
  if (pct <= 40) return 'w-[40%]';
  if (pct <= 50) return 'w-1/2';
  if (pct <= 60) return 'w-[60%]';
  if (pct <= 70) return 'w-[70%]';
  if (pct <= 80) return 'w-[80%]';
  if (pct <= 90) return 'w-[90%]';
  return 'w-[95%]';
}

function isMessageInScope(
  message: ChatMessageType,
  activeDocumentId: string | undefined,
  showAllMessages: boolean,
): boolean {
  if (showAllMessages || !activeDocumentId) return true;
  return message.scope === 'project' || !message.documentId || message.documentId === activeDocumentId;
}

export function ChatBar() {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStatus = useChatStore((s) => s.setStatus);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent);
  const showAllMessages = useChatStore((s) => s.showAllMessages);
  const applyToAllDocuments = useChatStore((s) => s.applyToAllDocuments);
  const pendingRetryPrompt = useChatStore((s) => s.pendingRetryPrompt);
  const setPendingRetryPrompt = useChatStore((s) => s.setPendingRetryPrompt);

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
  const documentStylePreset = useSettingsStore((s) => s.documentStylePreset);
  const setDocumentStylePreset = useSettingsStore((s) => s.setDocumentStylePreset);

  const isGenerating = status.state === 'generating';

  const workflowStepsRef = useRef<WorkflowStep[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pick up retry requests from the chat panel
  useEffect(() => {
    if (!pendingRetryPrompt || isGenerating) return;
    setPendingRetryPrompt(null);
    setInput(pendingRetryPrompt);
    // Submit on next tick so input state has settled
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [pendingRetryPrompt, isGenerating, setPendingRetryPrompt]);

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
    if ((!prompt && attachments.length === 0) || isGenerating) return;

    if (!hasApiKey()) {
      setShowSettings(true);
      return;
    }

    const activeArtifactId = activeDocument?.id;
    const messageScope = applyToAllDocuments || !activeArtifactId ? 'project' : 'document';
    const scopedDocumentId = messageScope === 'document' ? activeArtifactId : undefined;

    // Snapshot and clear attachments before async work
    const currentAttachments = attachments;
    setAttachments([]);
    setAttachmentError(null);

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      documentId: scopedDocumentId,
      scope: messageScope,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };
    addMessage(userMsg);
    setInput('');

    // Build text context from text-kind attachments
    const attachmentContext = buildAttachmentContext(currentAttachments);
    const promptWithContext = (attachmentContext
      ? `${prompt}${attachmentContext}`
      : prompt
    ).trim();

    // Build image parts for multi-modal messages
    const imageParts = currentAttachments
      .filter((a) => a.kind === 'image')
      .map((a) => ({ type: 'image' as const, image: a.content, mimeType: a.mimeType }));

    const chatHistory: AIMessage[] = messages
      .filter((message) => isMessageInScope(message, activeArtifactId, showAllMessages))
      .map((m) => ({
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
        const config = getActiveProvider();
        const [{ getProviderEntry }, { runPresentationWorkflow }] = await Promise.all([
          import('@/services/ai/registry'),
          import('@/services/ai/workflow/presentation'),
        ]);
        const providerEntry = getProviderEntry(providerId);

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
            case 'batch-slide-complete':
              // Progressively update canvas as each slide completes
              setSlides(event.html);
              setStatus({ state: 'generating', startedAt: Date.now(), step: `Slide ${event.slideIndex} of ${event.totalSlides} complete`, pct: Math.round(20 + (event.slideIndex / event.totalSlides) * 70), steps: [...workflowStepsRef.current] });
              break;
            case 'step-update':
              updateStepStatus(event.stepId, event.status);
              setStatus({ state: 'generating', startedAt: Date.now(), step: event.label, steps: [...workflowStepsRef.current] });
              break;
            case 'progress':
              setStatus({ state: 'generating', startedAt: Date.now(), step: event.message, pct: event.pct, steps: [...workflowStepsRef.current] });
              break;
          }
        };

        const existingSlides = isEditFlow ? activeDocument?.contentHtml : undefined;

        const result = await runPresentationWorkflow({
          input: {
            prompt: promptWithContext,
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
          // HTML is already sanitized by runPresentationWorkflow
          if (activeDocument?.type === 'presentation') {
            // Update existing presentation document
            const chartSpecs = extractChartSpecsFromHtml(result.html);
            updateDocument(activeDocument.id, {
              contentHtml: result.html,
              title: result.title || activeDocument.title,
              slideCount: result.slideCount,
              chartSpecs,
            });
          } else {
            // Create a new presentation document
            const chartSpecs = extractChartSpecsFromHtml(result.html);
            const newDoc: ProjectDocument = {
              id: crypto.randomUUID(),
              title: result.title || 'Presentation',
              type: 'presentation',
              contentHtml: result.html,
              themeCss: '',
              slideCount: result.slideCount,
              chartSpecs,
              order: project.documents.length,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            addDocument(newDoc);
          }

          if (result.title) setTitle(result.title);
          setSlides(result.html);
        }

        const reviewNote = result.reviewPassed ? '' : ' (QA flagged issues)';
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.html
            ? `✅ Generated ${result.slideCount} slides${reviewNote}.`
            : 'Generation completed but no slides were produced.',
          timestamp: Date.now(),
          documentId: scopedDocumentId,
          scope: messageScope,
        });

        // Auto-commit version after generation
        const action = isEditFlow ? 'Edited' : 'Created';
        const slideInfo = result.slideCount > 0 ? ` (${result.slideCount} slide${result.slideCount !== 1 ? 's' : ''})` : '';
        const commitMsg = `${action} presentation${slideInfo}: ${prompt.slice(0, 50)}`;
        // Read latest state after addDocument/updateDocument mutation (getState avoids stale closure)
        const updatedProject = useProjectStore.getState().project;
        commitVersion(updatedProject, commitMsg).catch((e) => console.warn('[VersionHistory] commit failed:', e));

        setStatus({ state: 'idle' });
        setStreamingContent('');
      } catch (err) {
        if (abortController.signal.aborted) {
          setStatus({ state: 'idle' });
          setStreamingContent('');
          addMessage({ id: crypto.randomUUID(), role: 'assistant', content: 'Generation cancelled.', timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
          return;
        }
        const message = err instanceof Error ? err.message : 'Generation failed';
        setStatus({ state: 'error', message });
        setStreamingContent('');
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
      }
    } else {
      // ─── Document workflow ─────────────────────────────────────
      workflowStepsRef.current = [
        { id: 'plan', label: 'Plan', status: 'pending' },
        { id: 'generate', label: isEdit ? 'Update' : 'Write', status: 'pending' },
        { id: 'qa', label: 'QA', status: 'pending' },
        { id: 'finalize', label: 'Finalize', status: 'pending' },
      ];

      setStatus({ state: 'generating', startedAt: Date.now(), step: 'Starting…', pct: 0, steps: workflowStepsRef.current });
      setStreamingContent('');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const config = getActiveProvider();
        const [{ getProviderEntry }, { runDocumentWorkflow }] = await Promise.all([
          import('@/services/ai/registry'),
          import('@/services/ai/workflow/document'),
        ]);
        const providerEntry = getProviderEntry(providerId);

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
              setStatus({ state: 'generating', startedAt: Date.now(), step: `Issue in ${event.stepId}`, steps: [...workflowStepsRef.current] });
              break;
          }
        };

        const existingDoc = isEdit && activeDocument?.type === 'document'
          ? activeDocument.contentHtml
          : undefined;

        // Build project links for cross-document linking
        const projectLinks: import('@/services/ai/workflow').DocumentProjectLink[] = project.documents
          .filter((d) => d.id !== activeDocument?.id && d.contentHtml)
          .map((d) => ({ id: d.id, title: d.title, type: d.type as 'document' | 'presentation' }));

        const result = await runDocumentWorkflow({
          input: {
            prompt: promptWithContext,
            existingHtml: existingDoc,
            existingMarkdown: activeDocument?.type === 'document' ? activeDocument.sourceMarkdown : undefined,
            chatHistory,
            styleHint: documentStylePreset,
            projectLinks: projectLinks.length > 0 ? projectLinks : undefined,
            imageParts: imageParts.length > 0 ? imageParts : undefined,
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
            const chartSpecs = extractChartSpecsFromHtml(result.html);
            updateDocument(activeDocument.id, {
              contentHtml: result.html,
              sourceMarkdown: result.markdown,
              title: result.title || activeDocument.title,
              chartSpecs,
            });
          } else {
            const chartSpecs = extractChartSpecsFromHtml(result.html);
            const newDoc: ProjectDocument = {
              id: crypto.randomUUID(),
              title: result.title || 'Document',
              type: 'document',
              contentHtml: result.html,
              sourceMarkdown: result.markdown,
              themeCss: '',
              slideCount: 0,
              chartSpecs,
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
          documentId: scopedDocumentId,
          scope: messageScope,
        });

        // Auto-commit version
        const docAction = existingDoc ? 'Edited' : 'Created';
        const commitMsg = `${docAction} document: ${prompt.slice(0, 60)}`;
        // Read latest state after addDocument/updateDocument mutation (getState avoids stale closure)
        const updatedProject = useProjectStore.getState().project;
        commitVersion(updatedProject, commitMsg).catch((e) => console.warn('[VersionHistory] commit failed:', e));

        setStatus({ state: 'idle' });
        setStreamingContent('');
      } catch (err) {
        if (abortController.signal.aborted) {
          setStatus({ state: 'idle' });
          setStreamingContent('');
          addMessage({ id: crypto.randomUUID(), role: 'assistant', content: 'Generation cancelled.', timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
          return;
        }
        const message = err instanceof Error ? err.message : 'Generation failed';
        setStatus({ state: 'error', message });
        setStreamingContent('');
        addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}`, timestamp: Date.now(), documentId: scopedDocumentId, scope: messageScope });
      }
    }
  }, [
    input, attachments, isGenerating, hasApiKey, setShowSettings, addMessage, messages,
    slidesHtml, setStatus, setStreamingContent, appendStreamingContent,
    providerId, getActiveProvider, setSlides, setTitle, updateStepStatus,
    activeDocument, addDocument, updateDocument, project, showAllMessages, applyToAllDocuments,
    documentStylePreset,
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

  // ─── File attachment handlers ──────────────────────────────────────────────

  const processFiles = useCallback(async (files: File[]) => {
    setAttachmentError(null);
    const results: FileAttachment[] = [];
    for (const file of files) {
      try {
        const attachment = await readFileAsAttachment(file);
        if (attachment) {
          results.push(attachment);
        } else {
          setAttachmentError(`"${file.name}" is not a supported file type (images and text files only).`);
        }
      } catch (err) {
        setAttachmentError(err instanceof Error ? err.message : `Failed to read "${file.name}"`);
      }
    }
    if (results.length > 0) {
      setAttachments((prev) => [...prev, ...results]);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);
      e.target.value = '';
    },
    [processFiles],
  );

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Drag-and-drop support
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  // Clipboard paste support (images)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
      }
    },
    [processFiles],
  );

  // Dismiss attachment error after 5 s
  useEffect(() => {
    if (!attachmentError) return;
    const timer = setTimeout(() => setAttachmentError(null), 5000);
    return () => clearTimeout(timer);
  }, [attachmentError]);

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isGenerating;
  const showDocumentStyleMenu = !activeDocument || activeDocument.type === 'document';
  const documentStyleLabel = DOCUMENT_STYLE_OPTIONS.find((option) => option.value === documentStylePreset)?.label ?? 'Auto';

  const placeholder = isGenerating
    ? 'Generating\u2026'
    : activeDocument
      ? `Update ${activeDocument.type === 'presentation' ? 'slides' : 'document'}\u2026`
      : 'What would you like to create?';

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
      <div
        className={cn(
          'relative mx-auto max-w-3xl rounded-xl transition-colors',
          isDragOver && 'ring-2 ring-violet-500/40 bg-violet-500/5',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isGenerating && (
          <div className="mb-2 rounded-lg border border-border/70 bg-muted/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-medium text-foreground/80">
                {status.step ?? 'Working...'}
              </p>
              {typeof status.pct === 'number' && status.pct > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground">{status.pct}%</span>
              )}
            </div>
            {typeof status.pct === 'number' && status.pct > 0 && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500',
                    progressWidthClass(status.pct),
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="group relative flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
              >
                {a.kind === 'image' ? (
                  <img
                    src={a.content}
                    alt={a.name}
                    className="size-5 rounded object-cover"
                  />
                ) : (
                  <span className="text-[10px]">📄</span>
                )}
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="ml-0.5 text-muted-foreground/60 hover:text-foreground"
                  aria-label={`Remove ${a.name}`}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isDragOver ? 'Drop files here…' : placeholder}
          disabled={isGenerating}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 pb-11 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:bg-background disabled:opacity-50"
        />
        <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {/* Attach file button */}
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={isGenerating}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              aria-label="Attach a file"
              title="Attach image or text file"
            >
              <Paperclip size={12} strokeWidth={2} />
            </button>
            {showDocumentStyleMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Choose document style"
                  >
                    <Sparkles size={12} strokeWidth={2} />
                    <span>{documentStyleLabel}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top">
                  {DOCUMENT_STYLE_OPTIONS.map((option, index) => (
                    <div key={option.value}>
                      {index === 1 && <DropdownMenuSeparator />}
                      <DropdownMenuItem onSelect={() => setDocumentStylePreset(option.value)}>
                        {documentStylePreset === option.value ? '✓ ' : ''}{option.label}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <span className="truncate text-[11px] text-muted-foreground/50">
              {isGenerating ? 'Generating\u2026' : 'Enter to send · Shift+Enter for new line'}
            </span>
          </div>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,text/plain,text/markdown,text/csv,application/json,.md,.csv,.txt,.json,.xml,.yaml,.yml,.log"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        aria-label="Attach files"
      />

      {attachmentError && (
        <p className="mt-1.5 text-center text-[11px] text-amber-500">{attachmentError}</p>
      )}

      {status.state === 'error' && (
        <p className="mt-2 text-center text-xs text-destructive">{status.message}</p>
      )}
    </div>
  );
}
