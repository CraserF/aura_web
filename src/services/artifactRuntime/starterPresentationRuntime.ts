import { buildArtifactRunPlan } from '@/services/artifactRuntime/build';
import { finalizeStaticPresentationRuntime } from '@/services/artifactRuntime/presentationRuntime';
import type { ArtifactRunPlan } from '@/services/artifactRuntime/types';
import type { TemplateId } from '@/services/ai/templates';
import type { PresentationOutput } from '@/services/ai/workflow/types';
import type { PresentationRecipeId } from '@/services/artifactRuntime/types';

export type StarterTokenValues = Record<string, string>;

export interface StaticPresentationStarterRuntimeInput {
  artifactKey: string;
  starterId: string;
  starterLabel: string;
  starterDescription: string;
  templateId: TemplateId;
  title: string;
  templateHtml: string;
  tokens: StarterTokenValues;
}

export interface StaticPresentationStarterRuntimeResult {
  output: PresentationOutput;
  runtimePlan: ArtifactRunPlan;
}

function extractTemplateSections(doc: Document): HTMLElement[] {
  const slideSections = Array.from(doc.querySelectorAll<HTMLElement>('.slides > section'));
  return slideSections.length > 0 ? slideSections : Array.from(doc.querySelectorAll<HTMLElement>('section'));
}

function replaceTokens(value: string, tokens: StarterTokenValues): string {
  return value.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, token: string) => tokens[token] ?? '');
}

function replaceTokensInElement(element: HTMLElement, tokens: StarterTokenValues): void {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }
  for (const textNode of textNodes) {
    textNode.nodeValue = replaceTokens(textNode.nodeValue ?? '', tokens);
  }

  const elements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  for (const node of elements) {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.value.includes('{{')) {
        node.setAttribute(attribute.name, replaceTokens(attribute.value, tokens));
      }
    }
  }
}

const STRUCTURAL_EMPTY_CLASSES = [
  'slide-content',
  'layout',
  'scene-particles',
  'particle',
  'slides',
  'reveal',
];

function isStructuralElement(element: HTMLElement): boolean {
  return STRUCTURAL_EMPTY_CLASSES.some((className) =>
    Array.from(element.classList).some((candidate) =>
      candidate === className || candidate.startsWith(`${className}-`)));
}

function hasMediaOrIconChild(element: HTMLElement): boolean {
  return Boolean(element.querySelector('img, svg, canvas, video, picture, icon, [data-icon]'));
}

function isSeparatorElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && (
    element.tagName.toLowerCase() === 'hr' ||
    element.classList.contains('separator') ||
    element.classList.contains('heading-divider')
  );
}

function cleanupEmptyOptionalStarterElements(section: HTMLElement): void {
  const candidates = Array.from(section.querySelectorAll<HTMLElement>('p, div'));

  for (const element of candidates) {
    if (isStructuralElement(element)) continue;
    if (element.textContent?.trim()) continue;
    if (hasMediaOrIconChild(element)) continue;

    const isParagraph = element.tagName.toLowerCase() === 'p';
    const isLeafDiv = element.tagName.toLowerCase() === 'div' && element.children.length === 0;
    if (!isParagraph && !isLeafDiv) continue;

    const nextElement = element.nextElementSibling;
    element.remove();
    if (isSeparatorElement(nextElement)) {
      nextElement.remove();
    }
  }
}

function getStarterSectionTitle(section: HTMLElement, index: number, deckTitle: string): string {
  const heading = section.querySelector<HTMLElement>('h1, h2, h3, .slide-title, .eyebrow');
  const text = heading?.textContent?.replace(/\s+/g, ' ').trim();
  return text || (index === 0 ? deckTitle : `Slide ${index + 1}`);
}

function buildStarterRuntimePlan(input: {
  artifactKey: string;
  starterId: string;
  starterLabel: string;
  starterDescription: string;
  templateId: TemplateId;
  title: string;
  sections: HTMLElement[];
}): ArtifactRunPlan {
  const sectionTitles = input.sections.map((section, index) =>
    getStarterSectionTitle(section, index, input.title));
  const prompt = `Create ${sectionTitles.length} slides: ${sectionTitles.join(', ')}`;
  const runtimePlan = buildArtifactRunPlan({
    runId: crypto.randomUUID(),
    prompt,
    artifactType: 'presentation',
    operation: 'create',
    activeDocument: null,
    mode: 'execute',
    providerId: 'openai',
    providerModel: 'starter-runtime',
    allowFullRegeneration: false,
  });
  const recipeId: PresentationRecipeId = runtimePlan.presentationRecipeId ?? 'general-polished';

  runtimePlan.userIntent = prompt;
  runtimePlan.intentSummary = `Starter runtime deck for ${input.starterLabel} using ${input.templateId}.`;
  runtimePlan.requestKind = 'batch';
  runtimePlan.queueMode = 'sequential';
  runtimePlan.workflow.summary = runtimePlan.intentSummary;
  runtimePlan.workflow.queueMode = 'sequential';
  runtimePlan.workflow.queuedWorkItems = sectionTitles.map((sectionTitle, index) => ({
    id: `starter-slide-${index + 1}`,
    orderIndex: index,
    targetType: 'slide',
    targetLabel: sectionTitle,
    operationKind: 'create',
    status: 'done',
    promptSummary: `${input.starterDescription} Starter slide ${index + 1}: ${sectionTitle}.`,
    recipeId,
  }));
  runtimePlan.workflow.templateGuidance.selectedTemplateId = input.templateId;
  runtimePlan.workflow.templateGuidance.intentFamily = 'batch';
  runtimePlan.workflow.templateGuidance.designConstraints = [
    `Use the ${input.templateId} production starter design family.`,
    `Starter artifact key: ${input.artifactKey}; starter id: ${input.starterId}.`,
    ...runtimePlan.workflow.templateGuidance.designConstraints,
  ];
  runtimePlan.templateGuidance = runtimePlan.workflow.templateGuidance;
  runtimePlan.designManifest.family = input.templateId;
  runtimePlan.designManifest.templateId = input.templateId;
  runtimePlan.workQueue = runtimePlan.workflow.queuedWorkItems.map((item) => ({
    id: item.id,
    artifactType: 'presentation',
    kind: 'slide',
    orderIndex: item.orderIndex,
    title: item.targetLabel,
    brief: item.promptSummary,
    status: 'done',
    sourceWorkItemId: item.id,
    ...(item.recipeId ? { recipeId: item.recipeId } : {}),
  }));

  return runtimePlan;
}

export function buildStaticPresentationStarterRuntime(
  input: StaticPresentationStarterRuntimeInput,
): StaticPresentationStarterRuntimeResult {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(input.templateHtml, 'text/html');
  const sections = extractTemplateSections(parsed)
    .map((entry) => entry.cloneNode(true) as HTMLElement)
    .filter(Boolean);

  if (sections.length === 0) {
    const fallbackHtml = `<section data-background-color="#ffffff"><h1>${input.title}</h1><p>${input.starterDescription}</p></section>`;
    const fallbackSection = parsed.createElement('section');
    fallbackSection.setAttribute('data-background-color', '#ffffff');
    fallbackSection.innerHTML = `<h1>${input.title}</h1><p>${input.starterDescription}</p>`;
    const runtimePlan = buildStarterRuntimePlan({
      artifactKey: input.artifactKey,
      starterId: input.starterId,
      starterLabel: input.starterLabel,
      starterDescription: input.starterDescription,
      templateId: input.templateId,
      title: input.title,
      sections: [fallbackSection],
    });

    return {
      output: finalizeStaticPresentationRuntime({
        rawHtml: fallbackHtml,
        title: input.title,
        slideCount: 1,
        runPlan: runtimePlan,
      }),
      runtimePlan,
    };
  }

  const firstHeading = sections[0]?.querySelector<HTMLElement>('h1, h2, h3');
  if (firstHeading) {
    firstHeading.textContent = input.title;
  } else {
    const heading = parsed.createElement('h1');
    heading.textContent = input.title;
    sections[0]?.prepend(heading);
  }

  for (const section of sections) {
    replaceTokensInElement(section, input.tokens);
    cleanupEmptyOptionalStarterElements(section);
  }

  const runtimePlan = buildStarterRuntimePlan({
    artifactKey: input.artifactKey,
    starterId: input.starterId,
    starterLabel: input.starterLabel,
    starterDescription: input.starterDescription,
    templateId: input.templateId,
    title: input.title,
    sections,
  });
  const styles = Array.from(parsed.querySelectorAll('style'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');
  const sectionHtml = sections.map((section) => section.outerHTML).join('\n');
  const rawHtml = styles ? `<style>\n${styles}\n</style>\n${sectionHtml}` : sectionHtml;

  return {
    output: finalizeStaticPresentationRuntime({
      rawHtml,
      title: input.title,
      slideCount: sections.length,
      runPlan: runtimePlan,
    }),
    runtimePlan,
  };
}
