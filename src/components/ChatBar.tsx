import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowUp, History, Paperclip, Sparkles, Square, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AIMessage } from '@/services/ai/types';
import type { LLMConfig } from '@/services/ai/workflow/types';
import type { ContextBundle } from '@/services/context/types';
import type { MemoryContextBuildResult, MemoryContextDetailMode } from '@/services/memory';
import type { FileAttachment, WorkflowStep } from '@/types';
import { materializeRenderAttachments, readFileAsAttachment } from '@/lib/fileAttachment';
import { cn } from '@/lib/utils';
import { submitPrompt } from '@/services/chat/submitPrompt';
import { ContextChips } from '@/components/ContextChips';
import { ContextPanel } from '@/components/ContextPanel';
import { RunHistoryPanel } from '@/components/RunHistoryPanel';
import { resolveWorkflowPresetState, diffContextPolicyOverride } from '@/services/presets/apply';
import { loadPresetCollection } from '@/services/presets/storage';
import { resolveProjectRulesSnapshot } from '@/services/projectRules/resolve';
import { loadContextPolicy } from '@/services/projectRules/load';
import { mergeContextPolicy } from '@/services/projectRules/merge';
import { upsertWorkflowStepStatus } from '@/services/chat/workflowProgress';
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

function capitalizeArtifactType(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

export function ChatBar() {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [runHistoryOpen, setRunHistoryOpen] = useState(false);
  const [lastContext, setLastContext] = useState<ContextBundle | null>(null);
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
  const pendingAutoSubmitPrompt = useChatStore((s) => s.pendingAutoSubmitPrompt);
  const setPendingAutoSubmitPrompt = useChatStore((s) => s.setPendingAutoSubmitPrompt);
  const selectedPresetId = useChatStore((s) => s.selectedPresetId);
  const setSelectedPresetId = useChatStore((s) => s.setSelectedPresetId);
  const contextSelection = useChatStore((s) => s.contextSelection);
  const setContextScopeMode = useChatStore((s) => s.setContextScopeMode);
  const setCompactionMode = useChatStore((s) => s.setCompactionMode);
  const setRecentMessageCount = useChatStore((s) => s.setRecentMessageCount);
  const togglePinnedDocumentId = useChatStore((s) => s.togglePinnedDocumentId);
  const togglePinnedMemoryPath = useChatStore((s) => s.togglePinnedMemoryPath);
  const togglePinnedSheetRef = useChatStore((s) => s.togglePinnedSheetRef);
  const toggleExcludedSourceId = useChatStore((s) => s.toggleExcludedSourceId);
  const resetContextSelection = useChatStore((s) => s.resetContextSelection);

  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);

  // Project store
  const project = useProjectStore((s) => s.project);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const addDocument = useProjectStore((s) => s.addDocument);
  const updateDocument = useProjectStore((s) => s.updateDocument);
  const setProject = useProjectStore((s) => s.setProject);
  const setActiveDocumentId = useProjectStore((s) => s.setActiveDocumentId);

  const getActiveProvider = useSettingsStore((s) => s.getActiveProvider);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);
  const documentStylePreset = useSettingsStore((s) => s.documentStylePreset);
  const setDocumentStylePreset = useSettingsStore((s) => s.setDocumentStylePreset);

  const isGenerating = status.state === 'generating';
  const workflowArtifactType = activeDocument?.type ?? 'document';
  const presetState = resolveWorkflowPresetState(
    project.workflowPresets,
    workflowArtifactType,
    selectedPresetId ?? undefined,
  );
  const presetLabel = presetState.appliedPreset?.name ?? 'Auto mode';

  const workflowStepsRef = useRef<WorkflowStep[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Stores a prompt that should be auto-submitted on the next handleSubmit call */
  const autoSubmitPromptRef = useRef<string | null>(null);

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

  // Auto-submit from clarifying question selection
  useEffect(() => {
    if (!pendingAutoSubmitPrompt || isGenerating) return;
    setPendingAutoSubmitPrompt(null);
    autoSubmitPromptRef.current = pendingAutoSubmitPrompt;
    handleSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoSubmitPrompt, isGenerating]);

  const updateStepStatus = useCallback(
    (stepId: string, stepStatus: WorkflowStep['status'], label?: string) => {
      workflowStepsRef.current = upsertWorkflowStepStatus(
        workflowStepsRef.current,
        stepId,
        stepStatus,
        label,
      );
    },
    [],
  );

  const queueMemoryExtraction = useCallback(async (
    llmConfig: LLMConfig,
    conversation: AIMessage[],
    artifactSummary: string,
    sourceRefs: string[],
  ) => {
    try {
      const { createInitialMemoryTree, extractMemoriesFromConversation, persistMemoryCandidates } = await import('@/services/memory');
      const candidates = await extractMemoriesFromConversation({
        llmConfig,
        conversation,
        projectId: project.id,
        artifactSummary,
      });

      if (candidates.length === 0) {
        return;
      }

      const currentProject = useProjectStore.getState().project;
      const nextMemoryTree = currentProject.memoryTree
        ? structuredClone(currentProject.memoryTree)
        : createInitialMemoryTree();

      persistMemoryCandidates(nextMemoryTree, candidates, {
        owner: 'local-user',
        sourceRefs,
      });

      setProject({
        ...currentProject,
        memoryTree: nextMemoryTree,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('[Memory] post-generation extraction failed:', error);
    }
  }, [project.id, setProject]);

  const buildWorkflowMemoryContext = useCallback(async (
    prompt: string,
    options?: {
      detailMode?: MemoryContextDetailMode;
      pinnedPaths?: string[];
      maxTokens?: number;
    },
  ): Promise<MemoryContextBuildResult> => {
    const currentProject = useProjectStore.getState().project;
    if (!currentProject.memoryTree) {
      return {
        text: '',
        tokenCount: 0,
        budgetExceeded: false,
        trimmedMemories: [],
        items: [],
      };
    }

    const { buildMemoryContextResult } = await import('@/services/memory');
    return buildMemoryContextResult(currentProject.memoryTree, prompt, {
      scope: `project:${currentProject.id}`,
      topK: 5,
      maxDirectories: 3,
      maxTokens: options?.maxTokens ?? 1200,
      detailMode: options?.detailMode ?? 'overview',
      pinnedPaths: options?.pinnedPaths ?? [],
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    // Consume any pending auto-submit prompt (set by clarifying question selection)
    const autoPrompt = autoSubmitPromptRef.current;
    autoSubmitPromptRef.current = null;

    const rawPrompt = autoPrompt ?? input;
    const prompt = rawPrompt.trim();
    if ((!prompt && attachments.length === 0) || isGenerating) return;

    if (!hasApiKey()) {
      setShowSettings(true);
      return;
    }

    // Snapshot and clear attachments before async work
    const currentAttachments = attachments;
    setAttachments([]);
    setAttachmentError(null);
    setInput('');
    const { project: nextProject } = materializeRenderAttachments(project, currentAttachments);
    if (nextProject !== project) {
      setProject(nextProject);
    }

    await submitPrompt({
      prompt,
      attachments: currentAttachments,
      messages,
      project: nextProject,
      activeDocument,
      showAllMessages,
      applyToAllDocuments,
      selectionState: contextSelection,
      providerConfig: getActiveProvider(),
      documentStylePreset,
      selectedPresetId: selectedPresetId ?? undefined,
      allowClarification: !autoPrompt,
    }, {
      workflowStepsRef,
      abortControllerRef,
      addMessage,
      addDocument,
      updateDocument,
      setStatus,
      setStreamingContent,
      appendStreamingContent,
      setSlides,
      setTitle,
      updateStepStatus,
      queueMemoryExtraction,
      buildWorkflowMemoryContext,
      onRunRequestBuilt: (runRequest) => setLastContext(runRequest.context),
    });
  }, [
    input, attachments, isGenerating, hasApiKey, setShowSettings, addMessage, messages,
    setStatus, setStreamingContent, appendStreamingContent,
    getActiveProvider, setSlides, setTitle, updateStepStatus,
    activeDocument, addDocument, updateDocument, project, setProject, showAllMessages, applyToAllDocuments,
    contextSelection, documentStylePreset, queueMemoryExtraction, buildWorkflowMemoryContext,
    selectedPresetId,
  ]);

  const persistWorkflowPresets = useCallback((workflowPresets: typeof project.workflowPresets) => {
    setProject({
      ...project,
      workflowPresets,
      updatedAt: Date.now(),
    });
  }, [project, setProject]);

  const buildPresetPayload = useCallback((existingPresetName?: string) => {
    const snapshot = resolveProjectRulesSnapshot(project, workflowArtifactType, selectedPresetId ?? undefined);
    const baseContextPolicy = loadContextPolicy(project.contextPolicy);
    const artifactContextPolicy = mergeContextPolicy(
      baseContextPolicy,
      baseContextPolicy.artifactOverrides?.[workflowArtifactType],
    );

    return {
      artifactType: workflowArtifactType,
      name: existingPresetName ?? `${capitalizeArtifactType(workflowArtifactType)} preset`,
      rulesAppendix: snapshot.appliedPreset?.rulesAppendix ?? '',
      contextPolicyOverrides: diffContextPolicyOverride(artifactContextPolicy, snapshot.contextPolicy),
      documentStylePreset: workflowArtifactType === 'document' ? documentStylePreset : undefined,
      enabled: true,
    };
  }, [documentStylePreset, project, selectedPresetId, workflowArtifactType]);

  const handleSavePreset = useCallback(() => {
    const collection = loadPresetCollection(project.workflowPresets);
    const selectedPreset = selectedPresetId
      ? collection.presets.find((preset) => preset.id === selectedPresetId)
      : undefined;

    if (selectedPreset) {
      persistWorkflowPresets({
        ...collection,
        presets: collection.presets.map((preset) => (
          preset.id === selectedPreset.id
            ? { ...preset, ...buildPresetPayload(selectedPreset.name) }
            : preset
        )),
      });
      return;
    }

    const nextPresetId = `preset-${crypto.randomUUID().slice(0, 8)}`;
    persistWorkflowPresets({
      ...collection,
      presets: [
        ...collection.presets,
        {
          id: nextPresetId,
          ...buildPresetPayload(
            `${capitalizeArtifactType(workflowArtifactType)} preset ${collection.presets.length + 1}`,
          ),
        },
      ],
    });
    setSelectedPresetId(nextPresetId);
  }, [buildPresetPayload, persistWorkflowPresets, project.workflowPresets, selectedPresetId, setSelectedPresetId, workflowArtifactType]);

  const handleDuplicatePreset = useCallback(() => {
    const collection = loadPresetCollection(project.workflowPresets);
    const sourcePreset = (selectedPresetId
      ? collection.presets.find((preset) => preset.id === selectedPresetId)
      : undefined)
      ?? presetState.selectedPreset
      ?? presetState.defaultPreset;
    if (!sourcePreset) return;

    const duplicateId = `preset-${crypto.randomUUID().slice(0, 8)}`;
    persistWorkflowPresets({
      ...collection,
      presets: [
        ...collection.presets,
        {
          ...sourcePreset,
          id: duplicateId,
          name: `${sourcePreset.name} Copy`,
        },
      ],
    });
    setSelectedPresetId(duplicateId);
  }, [persistWorkflowPresets, presetState.defaultPreset, presetState.selectedPreset, project.workflowPresets, selectedPresetId, setSelectedPresetId]);

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
      ? `Update ${activeDocument.type === 'presentation' ? 'slides' : activeDocument.type === 'spreadsheet' ? 'spreadsheet' : 'document'}\u2026`
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

        <div className="mb-2">
          <ContextChips
            selectionState={contextSelection}
            lastContext={lastContext}
            onOpen={() => setContextPanelOpen(true)}
          />
        </div>

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
            {activeDocument && !isGenerating && (
              <button
                type="button"
                onClick={() => setActiveDocumentId(activeDocument.id)}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                title={`Focus ${activeDocument.title}`}
              >
                {activeDocument.type === 'presentation' ? 'Slides' : activeDocument.type === 'spreadsheet' ? 'Sheet' : 'Doc'}:
                <span className="max-w-[100px] truncate font-medium text-foreground/70">{activeDocument.title}</span>
              </button>
            )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Choose output mode"
                >
                  <Sparkles size={12} strokeWidth={2} />
                  <span className="max-w-[120px] truncate">{presetLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onSelect={() => setSelectedPresetId(null)}>
                  {selectedPresetId === null ? '✓ ' : ''}Auto mode
                </DropdownMenuItem>
                {presetState.presets.presets
                  .filter((preset) => !preset.artifactType || preset.artifactType === workflowArtifactType)
                  .map((preset) => (
                    <DropdownMenuItem key={preset.id} onSelect={() => setSelectedPresetId(preset.id)}>
                      {selectedPresetId === preset.id ? '✓ ' : ''}{preset.name}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSavePreset}>
                  {selectedPresetId ? 'Update selected mode' : 'Save current as mode'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleDuplicatePreset}
                  disabled={!presetState.appliedPreset}
                >
                  Duplicate mode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setRunHistoryOpen(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Open recent runs"
            >
              <History size={12} strokeWidth={2} />
              <span>Runs</span>
            </button>
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

      <ContextPanel
        open={contextPanelOpen}
        onOpenChange={setContextPanelOpen}
        selectionState={contextSelection}
        activeDocument={activeDocument}
        projectDocuments={project.documents}
        memoryTree={project.memoryTree}
        lastContext={lastContext}
        onSetScopeMode={setContextScopeMode}
        onSetCompactionMode={setCompactionMode}
        onSetRecentMessageCount={setRecentMessageCount}
        onTogglePinnedDocumentId={togglePinnedDocumentId}
        onTogglePinnedMemoryPath={togglePinnedMemoryPath}
        onTogglePinnedSheetRef={togglePinnedSheetRef}
        onToggleExcludedSourceId={toggleExcludedSourceId}
        onReset={resetContextSelection}
      />
      <RunHistoryPanel
        open={runHistoryOpen}
        onOpenChange={setRunHistoryOpen}
      />
    </div>
  );
}
