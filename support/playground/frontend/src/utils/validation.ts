// Node validation utilities
import type { StepNodeData, ToolNodeData } from '../types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateStepNode(data: StepNodeData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required field validation
  if (!data.step_id || data.step_id.trim() === '') {
    errors.push({
      field: 'step_id',
      message: 'Step ID is required',
      severity: 'error'
    });
  }

  // Step ID format validation
  if (data.step_id && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.step_id)) {
    errors.push({
      field: 'step_id',
      message: 'Step ID must start with a letter or underscore and contain only letters, numbers, and underscores',
      severity: 'error'
    });
  }

  // Description validation
  if (!data.description || data.description.trim() === '') {
    warnings.push({
      field: 'description',
      message: 'Description is recommended for better documentation',
      severity: 'warning'
    });
  }

  // Routes validation
  if (data.routes && data.routes.length > 0) {
    data.routes.forEach((route, index) => {
      if (!route.target || route.target.trim() === '') {
        errors.push({
          field: `routes.${index}.target`,
          message: `Route ${index + 1}: Target step is required`,
          severity: 'error'
        });
      }
      if (!route.condition || route.condition.trim() === '') {
        warnings.push({
          field: `routes.${index}.condition`,
          message: `Route ${index + 1}: Condition description is recommended`,
          severity: 'warning'
        });
      }
    });
  }

  // Tools validation
  if (data.available_tools && data.available_tools.length === 0) {
    warnings.push({
      field: 'available_tools',
      message: 'Consider adding tools to make this step more functional',
      severity: 'warning'
    });
  }

  // Auto flow validation
  if (data.auto_flow) {
    if ((!data.routes || data.routes.length === 0) && (!data.available_tools || data.available_tools.length === 0)) {
      errors.push({
        field: 'auto_flow',
        message: 'Auto-flow steps must have at least one route or tool',
        severity: 'error'
      });
    }
    if (data.quick_suggestions) {
      errors.push({
        field: 'quick_suggestions',
        message: 'Auto-flow steps cannot have quick suggestions enabled',
        severity: 'error'
      });
    }
  }

  // Examples validation
  if (data.examples && data.examples.length > 0) {
    data.examples.forEach((example, index) => {
      if (!example.context || example.context.trim() === '') {
        errors.push({
          field: `examples.${index}.context`,
          message: `Example ${index + 1}: Context is required`,
          severity: 'error'
        });
      }
      if (!example.decision || example.decision.trim() === '') {
        errors.push({
          field: `examples.${index}.decision`,
          message: `Example ${index + 1}: Decision is required`,
          severity: 'error'
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateToolNode(data: ToolNodeData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required field validation
  if (!data.name || data.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Tool name is required',
      severity: 'error'
    });
  }

  // Tool name format validation
  if (data.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.name)) {
    errors.push({
      field: 'name',
      message: 'Tool name must start with a letter or underscore and contain only letters, numbers, and underscores',
      severity: 'error'
    });
  }

  // Description validation
  if (!data.description || data.description.trim() === '') {
    warnings.push({
      field: 'description',
      message: 'Description is recommended for better documentation',
      severity: 'warning'
    });
  }

  // Parameters validation
  if (data.parameters) {
    Object.entries(data.parameters).forEach(([key, param]) => {
      if (!param.description || param.description.trim() === '') {
        warnings.push({
          field: `parameters.${key}.description`,
          message: `Parameter "${key}": Description is recommended`,
          severity: 'warning'
        });
      }
    });
  }

  if (data.tool_type && data.tool_type !== 'custom') {
    if (!data.tool_identifier || data.tool_identifier.trim() === '') {
      errors.push({
        field: 'tool_identifier',
        message: 'Tool identifier is required for external tools',
        severity: 'error'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateNode(nodeType: 'step' | 'tool', data: StepNodeData | ToolNodeData): ValidationResult {
  if (nodeType === 'step') {
    return validateStepNode(data as StepNodeData);
  } else {
    return validateToolNode(data as ToolNodeData);
  }
}
