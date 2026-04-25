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

export function ProjectRulesPanel({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectRulesPanelProps) {
  const normalizedProject = normalizeProjectData(project);
  const [markdown, setMarkdown] = useState(normalizedProject.projectRules?.markdown ?? '');
  const [contextPolicy, setContextPolicy] = useState<ContextPolicy>(normalizedProject.contextPolicy!);
  const [workflowPresets, setWorkflowPresets] = useState<WorkflowPresetCollection>(normalizedProject.workflowPresets!);

  useEffect(() => {
    if (!open) return;
    const nextProject = normalizeProjectData(project);
    setMarkdown(nextProject.projectRules?.markdown ?? '');
    setContextPolicy(nextProject.contextPolicy!);
    setWorkflowPresets(nextProject.workflowPresets!);
  }, [open, project]);

  const handleSave = () => {
    onSave({
      projectRules: {
        markdown,
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
          <DialogTitle>Project Rules</DialogTitle>
          <DialogDescription>
            Define shared markdown rules, context limits, and workflow presets for this project.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Rules Markdown</h3>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add project-wide writing, design, or workflow rules here."
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save project rules</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
