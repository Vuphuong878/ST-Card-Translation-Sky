import { createContext, useContext } from 'react';
import { Project, APISettings, ChatMessage, WorkspaceStep, AppMode, SillyTavernPreset, PromptBlock, RegexScript, ToastMessage, ActionLogEntry } from './types';

export interface AppContextType {
  projects: Project[];
  activeProjectId: string;
  activeProject: Project;
  settings: APISettings;
  chatHistory: Record<string, ChatMessage[]>;
  activeStep: WorkspaceStep;
  appMode: AppMode;
  toasts: ToastMessage[];
  
  setActiveProjectId: (id: string) => void;
  setSettings: React.Dispatch<React.SetStateAction<APISettings>>;
  setActiveStep: (step: WorkspaceStep) => void;
  setAppMode: (mode: AppMode) => void;
  
  addToast: (text: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  
  createNewProject: (name: string) => Project;
  importProjectFromFile: (fileData: unknown, fileName: string) => void;
  deleteProject: (id: string) => void;
  updateProjectName: (id: string, name: string) => void;
  
  updatePresetParams: (params: Partial<SillyTavernPreset>) => void;
  addPromptBlock: (prompt: Omit<PromptBlock, 'identifier'> & { identifier?: string }) => void;
  updatePromptBlock: (identifier: string, updated: Partial<PromptBlock>) => void;
  deletePromptBlock: (identifier: string) => void;
  reorderPrompts: (identifiers: string[]) => void;
  
  addRegexScript: (regex: Omit<RegexScript, 'id'> & { id?: string }) => void;
  updateRegexScript: (id: string, updated: Partial<RegexScript>) => void;
  deleteRegexScript: (id: string) => void;
  
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatHistory: () => void;
  importFullPreset: (preset: unknown) => void;
  importRegexScript: (regex: unknown) => void;

  getActionLog: () => ActionLogEntry[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
