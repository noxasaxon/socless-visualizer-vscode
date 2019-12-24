export interface StepFunction {
  StartAt: string;
  States: Record<string, State>;
  Playbook?: string;
  Comment?: string;
}

export interface State {
  Next: string;
  Type: string;
  Choices?: Choice[];
  Default?: string;
  End?: boolean;
  Catch?: any[];
  Branches?: StepFunction[];
}
export interface Choice {
  Next: string;
}
