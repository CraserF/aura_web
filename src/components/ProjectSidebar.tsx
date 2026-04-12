import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Presentation,
  Plus,
  Trash2,
  ChevronRight,
  FolderOpen,
  MoreHorizontal,
  FilePlus,
  Pencil,
  X,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { ProjectDocument } from '@/types/project';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

/** Inline editable title input */
function InlineEdit({
  value,
  onSave,
  onCancel,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      aria-label="Edit title"
      title="Edit title"
      placeholder="Enter a title"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'w-full rounded border border-border bg-background px-1 py-0 text-xs font-medium leading-tight outline-none ring-1 ring-ring',
        className,
      )}
    />
  );
}

interface DocItemProps {
  doc: ProjectDocument;
  index: number;
  isActive: boolean;
  depth: number;
  onClick: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onAddSubDocument: (type: 'document' | 'presentation') => void;
}

function DocItem({
  doc,
  index,
  isActive,
  depth,
  onClick,
  onDelete,
  onRename,
  onAddSubDocument,
}: DocItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all',
        isActive
          ? 'bg-accent text-accent-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
      onClick={onClick}
    >
      {depth > 0 && (
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {Array.from({ length: depth - 1 }).map((_, index) => (
            <span key={index} className="w-4" />
          ))}
        </div>
      )}

      {/* Indent indicator for nested docs */}
      {depth > 0 && (
        <span className="mr-0.5 text-muted-foreground/30 text-[10px]">└</span>
      )}

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

      {/* Title */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <InlineEdit
            value={doc.title || 'Untitled'}
            onSave={(v) => {
              onRename(v);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <p className="truncate text-xs font-medium leading-tight">
              {doc.title || 'Untitled'}
            </p>
            <p className="truncate text-[10px] capitalize text-muted-foreground/70">
              {doc.type}
            </p>
          </>
        )}
      </div>

      {/* Active chevron + context menu side by side */}
      <div className="flex shrink-0 items-center gap-0.5">
        {isActive && <ChevronRight className="size-3 text-muted-foreground" />}

        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex size-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100',
                showMenu && 'opacity-100',
              )}
              aria-label={`Open actions for ${doc.title || 'Untitled'}`}
              title={`Open actions for ${doc.title || 'Untitled'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setShowMenu(false);
              }}
            >
              <Pencil className="mr-2 size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAddSubDocument('document');
                setShowMenu(false);
              }}
            >
              <FilePlus className="mr-2 size-3.5" />
              Add sub-document
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAddSubDocument('presentation');
                setShowMenu(false);
              }}
            >
              <Presentation className="mr-2 size-3.5 text-violet-500" />
              Add sub-presentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
    </div>
  );
}

/** Recursive tree renderer */
function DocTree({
  docs,
  allDocs,
  parentId,
  depth,
  activeDocumentId,
  onSelect,
  onDelete,
  onRename,
  onAddSubDocument,
}: {
  docs: ProjectDocument[];
  allDocs: ProjectDocument[];
  parentId: string | undefined;
  depth: number;
  activeDocumentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onAddSubDocument: (parentId: string, type: 'document' | 'presentation') => void;
}) {
  const children = docs
    .filter((d) => d.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {children.map((doc) => (
        <div key={doc.id}>
          <DocItem
            doc={doc}
            index={allDocs.indexOf(doc)}
            isActive={doc.id === activeDocumentId}
            depth={depth}
            onClick={() => onSelect(doc.id)}
            onDelete={() => onDelete(doc.id)}
            onRename={(title) => onRename(doc.id, title)}
            onAddSubDocument={(type) => onAddSubDocument(doc.id, type)}
          />
          {/* Render children */}
          <DocTree
            docs={docs}
            allDocs={allDocs}
            parentId={doc.id}
            depth={depth + 1}
            activeDocumentId={activeDocumentId}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
            onAddSubDocument={onAddSubDocument}
          />
        </div>
      ))}
    </>
  );
}

interface ProjectSidebarProps {
  open: boolean;
  onClose?: () => void;
  onRequestAddDocument?: (type: 'document' | 'presentation', parentId?: string) => void;
}

export function ProjectSidebar({ open, onClose, onRequestAddDocument }: ProjectSidebarProps) {
  const project = useProjectStore((s) => s.project);
  const activeDocumentId = useProjectStore((s) => s.project.activeDocumentId);
  const setActiveDocumentId = useProjectStore((s) => s.setActiveDocumentId);
  const removeDocument = useProjectStore((s) => s.removeDocument);
  const updateDocument = useProjectStore((s) => s.updateDocument);
  const setProjectTitle = useProjectStore((s) => s.setProjectTitle);

  const [editingProjectTitle, setEditingProjectTitle] = useState(false);

  if (!open) return null;

  const sortedDocs = [...project.documents].sort((a, b) => a.order - b.order);

  const handleAdd = (type: 'document' | 'presentation') => {
    onRequestAddDocument?.(type);
  };

  const handleAddSubDocument = (parentId: string, type: 'document' | 'presentation') => {
    onRequestAddDocument?.(type, parentId);
  };

  const handleRename = (id: string, title: string) => {
    updateDocument(id, { title });
  };

  const handleSelectDocument = (id: string) => {
    setActiveDocumentId(id);
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close project sidebar"
        className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-border bg-background/95 shadow-xl lg:static lg:z-auto lg:w-56 lg:shrink-0 lg:bg-background/80 lg:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FolderOpen className="size-3.5 shrink-0 text-violet-500" />
            {editingProjectTitle ? (
              <InlineEdit
                value={project.title}
                onSave={(v) => {
                  setProjectTitle(v);
                  setEditingProjectTitle(false);
                }}
                onCancel={() => setEditingProjectTitle(false)}
                className="flex-1"
              />
            ) : (
              <button
                className="truncate text-xs font-semibold text-foreground hover:text-violet-500 transition-colors text-left min-w-0 flex-1"
                onClick={() => setEditingProjectTitle(true)}
                title="Click to rename project"
              >
                {project.title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <NewDocMenu onAdd={handleAdd} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">Add document</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-muted-foreground hover:text-foreground lg:hidden"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Outline</p>
            <p className="text-[10px] text-muted-foreground/60">Document hierarchy and nested artifacts</p>
          </div>
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
              <DocTree
                docs={sortedDocs}
                allDocs={sortedDocs}
                parentId={undefined}
                depth={0}
                activeDocumentId={activeDocumentId}
                onSelect={handleSelectDocument}
                onDelete={removeDocument}
                onRename={handleRename}
                onAddSubDocument={handleAddSubDocument}
              />
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
    </>
  );
}
