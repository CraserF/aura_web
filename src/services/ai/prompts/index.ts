/**
 * Barrel export for the modular prompt system.
 * Backward-compatible: re-exports buildSystemPrompt for existing consumers.
 */

export { PromptComposer, buildDesignerPrompt } from './composer';

// Backward compatibility — existing code imports buildSystemPrompt
export { buildSystemPrompt } from './legacy';
