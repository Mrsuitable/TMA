export interface Task {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  category: 'work' | 'personal' | 'health' | 'leisure' | 'other';
  completed: boolean;
  notes?: string;
}

export interface AIOptimization {
  suggestions: string[];
  timeSavedEstimate: string;
  efficiencyScore: number;
  bottlenecks: string[];
}
