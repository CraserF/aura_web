import { useState } from 'react';
import {
  FileText,
  Presentation,
  Plus,
  Trash2,
  ChevronRight,
  FolderOpen,
  MoreHorizontal,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { ProjectDocument } from '@/types/project';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DOC_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-green-500 to-emerald-600',
  'from-red-500 to-pink-600',
];

function getDocColor(index: number): string {
  const color = DOC_COLORS[index % DOC_COLORS.length];
  return color ?? DOC_COLORS[0]!;
}

interface NewDocMenuProps {
  onAdd: (type: 'document' | 'presentation') => void;
}

function NewDocMenu({ onAdd }: NewDocMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onAdd('document')}>
          <FileText className="mr-2 size-4 text-blue-500" />
          Document
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('presentation')}>
          <Presentation className="mr-2 size-4 text-violet-500" />
          Presentation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface DocItemProps {
  doc: ProjectDocument;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function DocItem({ doc, index, isActive, onClick, onDelete }: DocItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all',
        isActive
          ? 'bg-accent text-accent-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
      onClick={onClick}
    >
      {/* Color dot */}
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm',
          getDocColor(index),
        )}
      >
        {doc.type === 'presentation' ? (
          <Presentation className="size-3.5" />
        ) : (
          <FileText className="size-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-tight">
          {doc.title || 'Untitled'}
        </p>
        <p className="truncate text-[10px] capitalize text-muted-foreground/70">
          {doc.type}
        </p>
      </div>

      {isActive && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}

      {/* Context menu */}
      <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'absolute right-1.5 flex size-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100',
              showMenu && 'opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ProjectSidebarProps {
  open: boolean;
  onRequestAddDocument?: (type: 'document' | 'presentation') => void;
}

export function ProjectSidebar({ open, onRequestAddDocument }: ProjectSidebarProps) {
  const project = useProjectStore((s) => s.project);
  const activeDocumentId = useProjectStore((s) => s.project.activeDocumentId);
  const setActiveDocumentId = useProjectStore((s) => s.setActiveDocumentId);
  const removeDocument = useProjectStore((s) => s.removeDocument);

  if (!open) return null;

  const sortedDocs = [...project.documents].sort((a, b) => a.order - b.order);

  const handleAdd = (type: 'document' | 'presentation') => {
    onRequestAddDocument?.(type);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-background/80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <FolderOpen className="size-3.5 shrink-0 text-violet-500" />
          <span className="truncate text-xs font-semibold text-foreground">
            {project.title}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <NewDocMenu onAdd={handleAdd} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">Add document</TooltipContent>
        </Tooltip>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No documents yet</p>
            <p className="text-[10px] text-muted-foreground/60">
              Use the chat to create one
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedDocs.map((doc, i) => (
              <DocItem
                key={doc.id}
                doc={doc}
                index={i}
                isActive={doc.id === activeDocumentId}
                onClick={() => setActiveDocumentId(doc.id)}
                onDelete={() => removeDocument(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="border-t border-border px-3 py-2">
        <p className="text-[10px] text-muted-foreground/60">
          {sortedDocs.length} document{sortedDocs.length !== 1 ? 's' : ''}
        </p>
      </div>
    </aside>
  );
}
