import type { ProjectRulesDocument } from '@/services/projectRules/types';

export function buildProjectRulesPromptBlock(projectRules: ProjectRulesDocument): string {
  const markdown = projectRules.markdown.trim();
  if (!markdown) {
    return '';
  }

  return `## PROJECT RULES\n\n${markdown}`;
}
