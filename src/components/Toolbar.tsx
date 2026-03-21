import {
  Settings,
  Download,
  Upload,
  Play,
  Plus,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { usePresentationStore } from '@/stores/presentationStore';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { downloadAuraFile } from '@/services/storage/fileFormat';
import { openAuraFile } from '@/services/storage/fileFormat';
import { buildPresentationData } from '@/services/storage/autosave';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function Toolbar({
  chatPanelOpen,
  onToggleChatPanel,
}: {
  chatPanelOpen: boolean;
  onToggleChatPanel: () => void;
}) {
  const title = usePresentationStore((s) => s.title);
  const slidesHtml = usePresentationStore((s) => s.slidesHtml);
  const themeCss = usePresentationStore((s) => s.themeCss);
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);
  const setThemeCss = usePresentationStore((s) => s.setThemeCss);
  const reset = usePresentationStore((s) => s.reset);

  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const setShowSettings = useSettingsStore((s) => s.setShowSettings);
  const providerId = useSettingsStore((s) => s.providerId);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const hasContent = Boolean(slidesHtml);

  const handleNew = () => {
    if (hasContent) {
      setConfirmNew(true);
      return;
    }
    doNew();
  };

  const doNew = () => {
    reset();
    clearMessages();
  };

  const handleSave = async () => {
    if (!slidesHtml) return;
    const data = buildPresentationData(
      title,
      slidesHtml,
      themeCss,
      messages,
    );
    await downloadAuraFile(data);
  };

  const handleOpen = () => {
    if (hasContent) {
      setConfirmImport(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const doOpen = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const data = await openAuraFile(file);
      setTitle(data.title);
      setSlides(data.slidesHtml);
      setThemeCss(data.themeCss);
      setMessages(data.chatHistory);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error reading file';
      setImportError(message);
      console.error('Failed to open .aura file:', err);
    }

    e.target.value = '';
  };

  const setPresenting = usePresentationStore((s) => s.setPresenting);

  const handlePresent = () => {
    setPresenting(true);
  };

  return (
    <>
    <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm font-semibold text-foreground">Aura</span>
        <Separator orientation="vertical" className="hidden h-4 sm:block" />
        <p className="max-w-48 truncate text-sm text-muted-foreground sm:max-w-72">
          {title}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleNew}>
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New presentation</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={handleOpen}>
              <Upload className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open .aura file</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleSave}
              disabled={!slidesHtml}
            >
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save as .aura</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handlePresent}
              disabled={!slidesHtml}
            >
              <Play className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Present fullscreen</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1.5 hidden h-4 sm:block" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowSettings(true)}
        >
          <span
            className={`size-1.5 rounded-full ${
              hasApiKey() ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            }`}
          />
          <span className="hidden sm:inline">{providerId}</span>
          <Settings className="size-3.5" />
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={chatPanelOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={onToggleChatPanel}
            >
              <MessageSquare className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{chatPanelOpen ? 'Hide' : 'Show'} chat history</TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          accept=".aura"
          onChange={handleFileChange}
          aria-label="Open .aura presentation file"
          className="hidden"
        />
      </div>
    </header>

    {/* Import error banner */}
    {importError && (
      <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">
          Failed to open file: {importError}
        </span>
        <button
          className="ml-auto shrink-0 text-destructive/70 hover:text-destructive"
          onClick={() => setImportError(null)}
        >
          Dismiss
        </button>
      </div>
    )}

    {/* Confirm new presentation */}
    <ConfirmDialog
      open={confirmNew}
      onOpenChange={setConfirmNew}
      title="Start a new presentation?"
      description="Your current presentation and chat history will be lost. Make sure you've saved your work first."
      confirmLabel="Discard & start new"
      onConfirm={doNew}
    />

    {/* Confirm import over existing */}
    <ConfirmDialog
      open={confirmImport}
      onOpenChange={setConfirmImport}
      title="Import over current presentation?"
      description="Opening a file will replace your current slides and chat history. Make sure you've saved your work first."
      confirmLabel="Continue import"
      onConfirm={doOpen}
    />
    </>
  );
}
