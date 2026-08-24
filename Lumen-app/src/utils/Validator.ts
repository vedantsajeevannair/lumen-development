export interface ValidationResult {
  readonly valid: boolean;
  readonly message?: string;
}

export function validateRequired(value: unknown): ValidationResult {
  return {
    valid: value !== null && value !== undefined && value !== "",
  };
}
