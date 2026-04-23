import type { ProjectData, ProjectDocument } from '@/types/project';

import { buildProjectGraph } from '@/services/projectGraph/build';
import { validateProjectGraph } from '@/services/projectGraph/validate';
import { runDataDiagnostics } from '@/services/diagnostics/checks/data';
import { runExportDiagnostics } from '@/services/diagnostics/checks/exports';
import { runMemoryDiagnostics } from '@/services/diagnostics/checks/memory';
import { runProjectDiagnostics } from '@/services/diagnostics/checks/project';
import {
  buildValidationResult,
  createValidationIssue,
} from '@/services/validation/profiles';
import { validateDocumentAgainstProfile } from '@/services/validation/documentValidation';
import { validatePresentationAgainstProfile } from '@/services/validation/presentationValidation';
import { validateSpreadsheetAgainstProfile } from '@/services/validation/spreadsheetValidation';
import { runCleanEnvironmentChecks } from '@/services/validation/cleanEnv';
import type { ValidationIssue, ValidationProfileId, ValidationResult } from '@/services/validation/types';

export interface ProjectValidationInput {
  project: ProjectData;
  profileId?: ValidationProfileId;
}

function mapDocumentValidation(document: ProjectDocument): ValidationIssue[] {
  const result = document.type === 'document'
    ? validateDocumentAgainstProfile({ document })
    : document.type === 'presentation'
      ? validatePresentationAgainstProfile({ document })
      : validateSpreadsheetAgainstProfile({ document });

  return [...result.blockingIssues, ...result.warnings];
}

function mapDiagnosticChecks(project: ProjectData): ValidationIssue[] {
  const checks = [
    runProjectDiagnostics(project),
    runExportDiagnostics(project),
    runDataDiagnostics(project),
    runMemoryDiagnostics(project),
  ];

  return checks.flatMap((check) =>
    check.diagnostics.map((diagnostic) =>
      createValidationIssue(
        diagnostic.severity === 'error' ? 'blocking' : 'warning',
        diagnostic.code,
        diagnostic.message,
        {
          source: check.id,
        },
      ),
    ),
  );
}

function mapDependencyIssues(project: ProjectData): ValidationIssue[] {
  return validateProjectGraph(buildProjectGraph(project)).map((issue) =>
    createValidationIssue(
      issue.status === 'broken' ? 'blocking' : 'warning',
      issue.code,
      issue.message,
      {
        targetDocumentId: issue.documentId,
        targetSheetId: issue.sheetId,
        source: 'dependency-graph',
      },
    ),
  );
}

export async function validateProjectAgainstProfile(input: ProjectValidationInput): Promise<ValidationResult> {
  const profileId = input.profileId ?? 'publish-ready';
  const artifactIssues = input.project.documents.flatMap((document) => mapDocumentValidation(document));
  const diagnosticIssues = mapDiagnosticChecks(input.project);
  const dependencyIssues = mapDependencyIssues(input.project);
  const cleanEnvIssues = await runCleanEnvironmentChecks();

  return buildValidationResult(
    profileId,
    input.project.documents.map((document) => ({
      documentId: document.id,
      artifactType: document.type,
    })),
    [
      ...artifactIssues,
      ...diagnosticIssues,
      ...dependencyIssues,
      ...cleanEnvIssues,
    ],
  );
}
