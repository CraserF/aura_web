export function buildProjectRulesPromptBlock(markdown: string, rulesAppendix?: string): string {
  const sections = [markdown.trim(), rulesAppendix?.trim() ?? ''].filter(Boolean);
  if (sections.length === 0) {
    return '';
  }

  return `## PROJECT RULES\n\n${sections.join('\n\n')}`;
}
