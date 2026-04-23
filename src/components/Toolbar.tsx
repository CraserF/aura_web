import {
  Settings,
  Download,
  FileDown,
  Upload,
  Play,
  FolderPlus,
  MessageSquare,
  AlertTriangle,
  History,
  PanelLeft,
  FolderOpen,
} from 'lucide-react';
import { usePresentationStore } from '@/stores/presentationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { downloadProjectFile } from '@/services/storage/projectFormat';
import { openProjectFile } from '@/services/storage/projectFormat';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ToolbarProps {
  chatPanelOpen: boolean;
  onToggleChatPanel: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  historyPanelOpen: boolean;
  onToggleHistoryPanel: () => void;
  artifactExportActions?: Array<{
    id: string;
    label: string;
    onSelect: () => void;
    disabled?: boolean;
  }>;
  artifactExportBusy?: boolean;
}

export function Toolbar({
  chatPanelOpen,
  onToggleChatPanel,
  sidebarOpen,
  onToggleSidebar,
  historyPanelOpen,
  onToggleHistoryPanel,
  artifactExportActions = [],
  artifactExportBusy = false,
}: ToolbarProps) {
  const project = useProjectStore((s) => s.project);
  const activeDocument = useProjectStore((s) => s.activeDocument());
  const resetProject = useProjectStore((s) => s.reset);
  const setProject = useProjectStore((s) => s.setProject);

  const slidesHtml = usePresentationStore((s) => s.slidesHtml);
  const isPresenting = usePresentationStore((s) => s.isPresenting);
  const setPresenting = usePresentationStore((s) => s.setPresenting);

  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setMessages = useChatStore((s) => s.setMessages);

  const setShowSettings = useSettingsStore((s) => s.setShowSettings);
  const providerId = useSettingsStore((s) => s.providerId);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const hasContent = project.documents.length > 0;

  const handleNew = () => {
    if (hasContent) {
      setConfirmNew(true);
      return;
    }
    doNew();
  };

  const doNew = () => {
    resetProject();
    clearMessages();
  };

  const handleSave = async () => {
    await downloadProjectFile({
      ...project,
      chatHistory: messages,
    });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const loadedProject = await openProjectFile(file);
      setProject(loadedProject);
      setMessages(loadedProject.chatHistory);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error reading file';
      setImportError(message);
      console.error('Failed to open .aura file:', err);
    }

    e.target.value = '';
  };

  const handlePresent = () => {
    if (activeDocument?.type === 'presentation') {
      setPresenting(true);
    }
  };

  const canPresent = activeDocument?.type === 'presentation' && !!slidesHtml && !isPresenting;
  const hasChatActivity = status.state === 'generating';

  return (
    <>
      <header className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-2.5">
          {/* Sidebar toggle */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={sidebarOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={onToggleSidebar}
                >
                  <PanelLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebarOpen ? 'Hide' : 'Show'} sidebar</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="hidden h-4 sm:block" />

            {/* Brand + project title */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                <span className="text-[10px] font-bold">A</span>
              </div>
              <span className="hidden text-sm font-semibold text-foreground sm:inline">Aura</span>
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
              <FolderOpen className="hidden size-3.5 shrink-0 text-violet-500 sm:block" />
              <p className="max-w-32 truncate text-sm text-muted-foreground sm:max-w-64">
                {project.title}
              </p>
              {activeDocument && (
                <>
                  <span className="hidden text-muted-foreground/40 sm:inline">/</span>
                  <p className="hidden max-w-32 truncate text-sm text-foreground sm:block">
                    {activeDocument.title}
                  </p>
                </>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground sm:hidden"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            <span
              className={`size-1.5 rounded-full ${
                hasApiKey() ? 'bg-emerald-500' : 'bg-muted-foreground/40'
              }`}
            />
            <Settings className="size-3.5" />
          </Button>
        </div>

        <div className="hidden items-center gap-0.5 sm:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={handleNew}
              >
                <FolderPlus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={handleOpen}
              >
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
                disabled={!hasContent}
              >
                <Download className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save project as .aura</TooltipContent>
          </Tooltip>

          {artifactExportActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  disabled={artifactExportBusy}
                >
                  <FileDown className="size-3.5" />
                  <span className="hidden sm:inline">Export artifact</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {artifactExportActions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    disabled={action.disabled}
                    onSelect={(event) => {
                      event.preventDefault();
                      action.onSelect();
                    }}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={handlePresent}
                disabled={!canPresent}
              >
                <Play className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Present fullscreen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={historyPanelOpen ? 'secondary' : 'ghost'}
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={onToggleHistoryPanel}
              >
                <History className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Version history</TooltipContent>
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
                className="relative size-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={onToggleChatPanel}
              >
                <MessageSquare className="size-4" />
                {hasChatActivity && (
                  <span className="absolute right-1.5 top-1.5 flex size-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{chatPanelOpen ? 'Hide' : 'Show'} chat history</TooltipContent>
          </Tooltip>

        </div>

        <div className="flex w-full items-center justify-between sm:hidden">
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handleNew}
                >
                  <FolderPlus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New project</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handleOpen}
                >
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
                  disabled={!hasContent}
                >
                  <Download className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save project as .aura</TooltipContent>
            </Tooltip>

            {artifactExportActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled={artifactExportBusy}
                  >
                    <FileDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {artifactExportActions.map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      disabled={action.disabled}
                      onSelect={(event) => {
                        event.preventDefault();
                        action.onSelect();
                      }}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={handlePresent}
                  disabled={!canPresent}
                >
                  <Play className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Present fullscreen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={historyPanelOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={onToggleHistoryPanel}
                >
                  <History className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Version history</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={chatPanelOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="relative size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={onToggleChatPanel}
                >
                  <MessageSquare className="size-4" />
                  {hasChatActivity && (
                    <span className="absolute right-1.5 top-1.5 flex size-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{chatPanelOpen ? 'Hide' : 'Show'} chat history</TooltipContent>
            </Tooltip>
          </div>

        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".aura"
          onChange={handleFileChange}
          aria-label="Open .aura project file"
          className="hidden"
        />
      </header>

      {importError && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">Failed to open file: {importError}</span>
          <button
            className="ml-auto shrink-0 text-destructive/70 hover:text-destructive"
            onClick={() => setImportError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmNew}
        onOpenChange={setConfirmNew}
        title="Start a new project?"
        description="Your current project and chat history will be lost. Make sure you've saved your work first."
        confirmLabel="Discard & start new"
        onConfirm={doNew}
      />

      <ConfirmDialog
        open={confirmImport}
        onOpenChange={setConfirmImport}
        title="Import over current project?"
        description="Opening a file will replace your current project. Make sure you've saved your work first."
        confirmLabel="Continue import"
        onConfirm={doOpen}
      />
    </>
  );
}
