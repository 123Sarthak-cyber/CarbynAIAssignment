import React from "react";
import { DiagnosticChecklist } from "../types";
import { CheckCircle2, ShieldAlert, Circle, Play, ChevronRight, RotateCcw } from "lucide-react";

interface SOPProgressChecklistProps {
  checklist: DiagnosticChecklist | null;
  safetyInstruction: string;
  onAdvanceStep: () => void;
  onSelectStep: (index: number) => void;
  onResetSession: () => void;
}

export default function SOPProgressChecklist({
  checklist,
  safetyInstruction,
  onAdvanceStep,
  onSelectStep,
  onResetSession,
}: SOPProgressChecklistProps) {
  if (!checklist) {
    return (
      <div id="sop-checklist-idle-state" className="bg-[#151619] border border-[#2a2a2c] rounded-sm p-6 text-center text-[#8e9299] select-none font-mono">
        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#8e9299]/60" />
        <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-widest mb-1">
          No SOP Active Campaign
        </h3>
        <p className="text-[10px] max-w-sm mx-auto leading-normal">
          Select an equipment category above and click an SOP campaign action button to initialize real-time co-pilot guides.
        </p>
      </div>
    );
  }

  return (
    <div id="sop-checklist-active-state" className="flex flex-col bg-[#151619] border border-[#2a2a2c] rounded-sm overflow-hidden font-mono text-xs text-[#e0e0e0] shadow-xl">
      {/* Header bar */}
      <div className="bg-black/40 px-4 py-3 border-b border-[#2a2a2c] flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#f27d26] animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Actionable SOP Guidance
          </span>
        </div>
        <button
          id="btn-loto-abrupt-abort"
          onClick={onResetSession}
          className="text-[9px] bg-black hover:bg-black/40 text-[#8e9299] hover:text-red-400 border border-[#2a2a2c] px-2 py-1 rounded-sm transition flex items-center gap-1 font-bold cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> RESET WORKFLOW
        </button>
      </div>

      {/* Safety Warning Panel */}
      <div className="bg-red-500/10 border-b border-[#2a2a2c] p-4 flex gap-3 text-red-200">
        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 select-none" />
        <div className="flex flex-col gap-0.5">
          <span className="font-extrabold tracking-widest text-[9px] uppercase text-red-500 block">
            ⚠️ MANDATORY AR RISK WARNING
          </span>
          <p className="font-sans leading-relaxed text-red-300 text-[11px]">
            {safetyInstruction || "Always follow lock-out tag-out (LOTO) protocols and verify zero electrical potential before touching active internal loops."}
          </p>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-4 flex flex-col gap-1.5 overflow-y-auto max-h-[350px]">
        {checklist.steps.map((step, idx) => {
          const isCurrent = idx === checklist.currentStepIndex;
          const isCompleted = idx < checklist.currentStepIndex;
          
          let stateClass = "bg-[#151619] border-[#2a2a2c] text-[#8e9299] opacity-50";
          let circleIcon = <Circle className="w-3.5 h-3.5 text-[#2a2a2c]" />;

          if (isCurrent) {
            stateClass = "bg-[#2a2a2c] border-[#f27d26] text-white";
            circleIcon = <Play className="w-3.5 h-3.5 text-[#f27d26] animate-pulse" fill="currentColor" />;
          } else if (isCompleted) {
            stateClass = "bg-[#151619]/60 border-[#2a2a2c] text-[#8e9299]";
            circleIcon = <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff41]" fill="none" />;
          }

          return (
            <div
              id={`checklist-step-row-${idx}`}
              key={idx}
              onClick={() => onSelectStep(idx)}
              className={`border p-3 rounded-sm flex items-start gap-3 transition cursor-pointer select-none ${stateClass}`}
            >
              <div className="mt-0.5 shrink-0">
                {circleIcon}
              </div>
              <div className="flex flex-col gap-0.5 w-full">
                <div className="flex justify-between items-center text-[9px] font-bold tracking-wider">
                  <span>STEP {idx + 1} OF {checklist.steps.length}</span>
                  {isCurrent && (
                    <span className="text-[8px] bg-[#f27d26] text-black px-1.5 py-0.2 rounded-sm font-black animate-pulse uppercase">
                      ACTIVE HUD LENS
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[8px] text-[#00ff41] font-bold uppercase">
                      VERIFIED COMPLETED ✓
                    </span>
                  )}
                </div>
                <p className="font-sans text-[11px] mt-1 text-slate-100 leading-normal">
                  {step.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Step Advancement Override Trigger */}
      <div className="p-4 bg-black/40 border-t border-[#2a2a2c] flex justify-between items-center">
        <div className="text-[10px] text-[#8e9299] font-sans leading-tight">
          <span className="font-mono text-[#f27d26] font-bold uppercase block mb-0.5">📟 CO-PILOT AGENT:</span>
          Say <span className="text-white font-mono font-bold bg-black px-1 rounded-sm">"next step"</span> or press override to advance.
        </div>
        <button
          id="btn-override-advancement"
          onClick={onAdvanceStep}
          className="bg-[#f27d26] hover:bg-[#e06d1c] text-black font-semibold px-3 py-1.5 rounded-sm flex items-center gap-1 transition-all shadow-lg text-[10px] cursor-pointer"
        >
          CONFIRM STEP <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
