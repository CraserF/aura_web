import { useEffect, useState } from 'react';
import type { ContextPolicy, ProjectData, WorkflowPreset, WorkflowPresetCollection } from '@/types/project';
import { normalizeProjectData } from '@/services/projectRules/load';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProjectRulesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectData;
  onSave: (updates: Pick<ProjectData, 'projectRules' | 'contextPolicy' | 'workflowPresets'>) => void;
}

const ARTIFACT_TYPES = ['document', 'presentation', 'spreadsheet'] as const;
const STYLE_BLOCK_START = '<!-- aura:project-style:start -->';
const STYLE_BLOCK_END = '<!-- aura:project-style:end -->';

const DEFAULT_AUDIENCE = 'Leadership';
const DEFAULT_TONE = 'Executive';
const DEFAULT_VISUAL_STYLE = 'Polished light';
const DEFAULT_QUALITY_SPEED = 'Best quality';
const DEFAULT_SOURCE_USAGE = 'Use relevant sources automatically';

const AUDIENCE_OPTIONS = [DEFAULT_AUDIENCE, 'Clients', 'Internal team', 'Students', 'General audience'];
const TONE_OPTIONS = [DEFAULT_TONE, 'Editorial', 'Persuasive', 'Teaching', 'Operational'];
const VISUAL_STYLE_OPTIONS = [DEFAULT_VISUAL_STYLE, 'Launch energy', 'Editorial grid', 'Research clean', 'Data story'];
const QUALITY_SPEED_OPTIONS = [DEFAULT_QUALITY_SPEED, 'Balanced', 'Fast draft'];
const SOURCE_USAGE_OPTIONS = [DEFAULT_SOURCE_USAGE, 'Prefer attached sources', 'Use only selected sources'];

function stripGuidedStyleBlock(markdown: string): string {
  const startIndex = markdown.indexOf(STYLE_BLOCK_START);
  const endIndex = markdown.indexOf(STYLE_BLOCK_END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return markdown;
  return `${markdown.slice(0, startIndex)}${markdown.slice(endIndex + STYLE_BLOCK_END.length)}`.trim();
}

function readGuidedField(markdown: string, label: string, fallback: string): string {
  const match = markdown.match(new RegExp(`- ${label}:\\s*(.+)`));
  return match?.[1]?.trim() || fallback;
}

function buildGuidedStyleBlock({
  audience,
  tone,
  visualStyle,
  qualitySpeed,
  sourceUsage,
  note,
}: {
  audience: string;
  tone: string;
  visualStyle: string;
  qualitySpeed: string;
  sourceUsage: string;
  note: string;
}): string {
  return `${STYLE_BLOCK_START}
## Project Style

- Audience: ${audience}
- Tone: ${tone}
- Visual style: ${visualStyle}
- Quality preference: ${qualitySpeed}
- Source usage: ${sourceUsage}
${note.trim() ? `- Extra guidance: ${note.trim()}` : ''}
${STYLE_BLOCK_END}`;
}

export function ProjectRulesPanel({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectRulesPanelProps) {
  const normalizedProject = normalizeProjectData(project);
  const initialMarkdown = normalizedProject.projectRules?.markdown ?? '';
  const [audience, setAudience] = useState(readGuidedField(initialMarkdown, 'Audience', DEFAULT_AUDIENCE));
  const [tone, setTone] = useState(readGuidedField(initialMarkdown, 'Tone', DEFAULT_TONE));
  const [visualStyle, setVisualStyle] = useState(readGuidedField(initialMarkdown, 'Visual style', DEFAULT_VISUAL_STYLE));
  const [qualitySpeed, setQualitySpeed] = useState(readGuidedField(initialMarkdown, 'Quality preference', DEFAULT_QUALITY_SPEED));
  const [sourceUsage, setSourceUsage] = useState(readGuidedField(initialMarkdown, 'Source usage', DEFAULT_SOURCE_USAGE));
  const [styleNote, setStyleNote] = useState(readGuidedField(initialMarkdown, 'Extra guidance', ''));
  const [markdown, setMarkdown] = useState(stripGuidedStyleBlock(initialMarkdown));
  const [contextPolicy, setContextPolicy] = useState<ContextPolicy>(normalizedProject.contextPolicy!);
  const [workflowPresets, setWorkflowPresets] = useState<WorkflowPresetCollection>(normalizedProject.workflowPresets!);

  useEffect(() => {
    if (!open) return;
    const nextProject = normalizeProjectData(project);
    const nextMarkdown = nextProject.projectRules?.markdown ?? '';
    setAudience(readGuidedField(nextMarkdown, 'Audience', DEFAULT_AUDIENCE));
    setTone(readGuidedField(nextMarkdown, 'Tone', DEFAULT_TONE));
    setVisualStyle(readGuidedField(nextMarkdown, 'Visual style', DEFAULT_VISUAL_STYLE));
    setQualitySpeed(readGuidedField(nextMarkdown, 'Quality preference', DEFAULT_QUALITY_SPEED));
    setSourceUsage(readGuidedField(nextMarkdown, 'Source usage', DEFAULT_SOURCE_USAGE));
    setStyleNote(readGuidedField(nextMarkdown, 'Extra guidance', ''));
    setMarkdown(stripGuidedStyleBlock(nextMarkdown));
    setContextPolicy(nextProject.contextPolicy!);
    setWorkflowPresets(nextProject.workflowPresets!);
  }, [open, project]);

  const handleSave = () => {
    const guidedMarkdown = buildGuidedStyleBlock({
      audience,
      tone,
      visualStyle,
      qualitySpeed,
      sourceUsage,
      note: styleNote,
    });
    onSave({
      projectRules: {
        markdown: [guidedMarkdown, markdown.trim()].filter(Boolean).join('\n\n'),
        updatedAt: Date.now(),
      },
      contextPolicy,
      workflowPresets,
    });
    onOpenChange(false);
  };

  const updatePreset = (index: number, updates: Partial<WorkflowPreset>) => {
    setWorkflowPresets((current) => ({
      ...current,
      presets: current.presets.map((preset, presetIndex) => (
        presetIndex === index ? { ...preset, ...updates } : preset
      )),
    }));
  };

  const removePreset = (index: number) => {
    setWorkflowPresets((current) => {
      const preset = current.presets[index];
      const nextPresets = current.presets.filter((_, presetIndex) => presetIndex !== index);
      const nextDefaults = { ...current.defaultPresetByArtifact };

      for (const artifactType of ARTIFACT_TYPES) {
        if (nextDefaults[artifactType] === preset?.id) {
          delete nextDefaults[artifactType];
        }
      }

      return {
        ...current,
        presets: nextPresets,
        defaultPresetByArtifact: nextDefaults,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Style</DialogTitle>
          <DialogDescription>
            Choose simple defaults for how Aura writes, designs, and uses sources in this project.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Guided Defaults</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Audience" value={audience} options={AUDIENCE_OPTIONS} onChange={setAudience} />
            <SelectField label="Tone" value={tone} options={TONE_OPTIONS} onChange={setTone} />
            <SelectField label="Visual style" value={visualStyle} options={VISUAL_STYLE_OPTIONS} onChange={setVisualStyle} />
            <SelectField label="Quality / speed" value={qualitySpeed} options={QUALITY_SPEED_OPTIONS} onChange={setQualitySpeed} />
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">Source usage</span>
              <select
                value={sourceUsage}
                onChange={(event) => setSourceUsage(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {SOURCE_USAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            value={styleNote}
            onChange={(event) => setStyleNote(event.target.value)}
            className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Optional extra preference, such as preferred terminology, brand voice, or design constraints."
          />
        </section>

        <details className="space-y-3 rounded-md border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Advanced</summary>

          <section className="space-y-2 pt-3">
            <h3 className="text-sm font-semibold">Rules Markdown</h3>
            <textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional raw project-wide writing, design, or workflow rules."
            />
          </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Context Policy</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={contextPolicy.includeProjectChat ?? true}
                onChange={(event) => setContextPolicy((current) => ({ ...current, includeProjectChat: event.target.checked }))}
              />
              Include project chat
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={contextPolicy.includeMemory ?? true}
                onChange={(event) => setContextPolicy((current) => ({ ...current, includeMemory: event.target.checked }))}
              />
              Include memory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={contextPolicy.includeAttachments ?? true}
                onChange={(event) => setContextPolicy((current) => ({ ...current, includeAttachments: event.target.checked }))}
              />
              Include attachments
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={contextPolicy.includeRelatedDocuments ?? true}
                onChange={(event) => setContextPolicy((current) => ({ ...current, includeRelatedDocuments: event.target.checked }))}
              />
              Include related documents
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <NumberField
              label="Max chat messages"
              value={contextPolicy.maxChatMessages ?? 0}
              onChange={(value) => setContextPolicy((current) => ({ ...current, maxChatMessages: value }))}
            />
            <NumberField
              label="Max memory tokens"
              value={contextPolicy.maxMemoryTokens ?? 0}
              onChange={(value) => setContextPolicy((current) => ({ ...current, maxMemoryTokens: value }))}
            />
            <NumberField
              label="Max related documents"
              value={contextPolicy.maxRelatedDocuments ?? 0}
              onChange={(value) => setContextPolicy((current) => ({ ...current, maxRelatedDocuments: value }))}
            />
            <NumberField
              label="Max attachment characters"
              value={contextPolicy.maxAttachmentChars ?? 0}
              onChange={(value) => setContextPolicy((current) => ({ ...current, maxAttachmentChars: value }))}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Workflow Presets</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWorkflowPresets((current) => ({
                ...current,
                presets: [
                  ...current.presets,
                  {
                    id: `preset-${crypto.randomUUID().slice(0, 8)}`,
                    name: 'New Preset',
                    enabled: true,
                  },
                ],
              }))}
            >
              Add preset
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {ARTIFACT_TYPES.map((artifactType) => (
              <label key={artifactType} className="space-y-1 text-sm">
                <span className="font-medium capitalize">{artifactType} default</span>
                <select
                  value={workflowPresets.defaultPresetByArtifact[artifactType] ?? ''}
                  onChange={(event) => setWorkflowPresets((current) => ({
                    ...current,
                    defaultPresetByArtifact: {
                      ...current.defaultPresetByArtifact,
                      ...(event.target.value ? { [artifactType]: event.target.value } : {}),
                    },
                  }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {workflowPresets.presets
                    .filter((preset) => !preset.artifactType || preset.artifactType === artifactType)
                    .map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>

          <div className="space-y-3">
            {workflowPresets.presets.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No workflow presets yet.
              </div>
            ) : workflowPresets.presets.map((preset, index) => (
              <div key={`${preset.id}-${index}`} className="space-y-3 rounded-lg border border-border p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Preset id</span>
                    <Input
                      value={preset.id}
                      onChange={(event) => updatePreset(index, { id: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Name</span>
                    <Input
                      value={preset.name}
                      onChange={(event) => updatePreset(index, { name: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Artifact type</span>
                    <select
                      value={preset.artifactType ?? ''}
                      onChange={(event) => updatePreset(index, {
                        artifactType: event.target.value
                          ? event.target.value as WorkflowPreset['artifactType']
                          : undefined,
                      })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Any</option>
                      {ARTIFACT_TYPES.map((artifactType) => (
                        <option key={artifactType} value={artifactType}>
                          {artifactType}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Document style preset</span>
                    <Input
                      value={preset.documentStylePreset ?? ''}
                      onChange={(event) => updatePreset(index, { documentStylePreset: event.target.value || undefined })}
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      checked={preset.enabled}
                      onChange={(event) => updatePreset(index, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>

                <label className="space-y-1 text-sm">
                  <span className="font-medium">Rules appendix</span>
                  <textarea
                    value={preset.rulesAppendix ?? ''}
                    onChange={(event) => updatePreset(index, { rulesAppendix: event.target.value || undefined })}
                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Optional preset-specific guidance appended to project rules."
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField
                    label="Override max chat messages"
                    value={preset.contextPolicyOverrides?.maxChatMessages ?? 0}
                    onChange={(value) => updatePreset(index, {
                      contextPolicyOverrides: {
                        ...preset.contextPolicyOverrides,
                        maxChatMessages: value,
                      },
                    })}
                  />
                  <NumberField
                    label="Override max attachment characters"
                    value={preset.contextPolicyOverrides?.maxAttachmentChars ?? 0}
                    onChange={(value) => updatePreset(index, {
                      contextPolicyOverrides: {
                        ...preset.contextPolicyOverrides,
                        maxAttachmentChars: value,
                      },
                    })}
                  />
                </div>

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => removePreset(index)}>
                    Remove preset
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
        </details>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save project style</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value || '0', 10) || 0)}
      />
    </label>
  );
}
