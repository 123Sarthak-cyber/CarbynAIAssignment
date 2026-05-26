/**
 * Shared Type Definitions for Carbyn AI smart glasses co-pilot.
 */

export interface TechnicalSOP {
  id: string;
  title: string;
  symptoms: string[];
  steps: string[];
  safetyFirst: string;
}

export interface EquipmentManual {
  id: string;
  name: string;
  model: string;
  category: "HVAC" | "Pumping" | "Electrical";
  specs: { [key: string]: string };
  commonFaults: string[];
  sops: TechnicalSOP[];
  imageUrl: string;
}

export interface Message {
  id: string;
  timestamp: string;
  sender: "user" | "assistant";
  text: string;
  hasAudio?: boolean;
  audioUrl?: string; // Client playback
  isVoiceInput?: boolean;
  visionTarget?: {
    identified: boolean;
    itemName: string;
    confidence: number;
    description: string;
    detectedAnomalies: string[];
    groundingBoxes?: Array<{
      label: string;
      box2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
    }>;
  };
}

export interface DiagnosticChecklist {
  sopId: string;
  sopTitle: string;
  currentStepIndex: number;
  steps: Array<{
    text: string;
    status: "pending" | "current" | "completed";
    technicianConfirmed: boolean;
  }>;
}

export interface DiagnosticSession {
  id: string;
  equipmentId: string;
  status: "idle" | "diagnosing" | "guided_rectification" | "completed";
  checklist: DiagnosticChecklist | null;
  anomaliesDetected: string[];
}
