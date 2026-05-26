import React from "react";
import { EquipmentManual } from "../types";
import { Cpu, Thermometer, Droplet, Zap, FileText, ArrowRight } from "lucide-react";

interface DeviceManualCardProps {
  manuals: EquipmentManual[];
  activeManualId: string;
  onSelectManual: (id: string) => void;
  onStartDiagnostics: (manualId: string, sopId: string) => void;
}

export default function DeviceManualCard({
  manuals,
  activeManualId,
  onSelectManual,
  onStartDiagnostics,
}: DeviceManualCardProps) {
  return (
    <div id="equipment-manual-card-container" className="flex flex-col gap-3 font-mono">
      <div className="flex items-center gap-2 select-none">
        <Cpu className="w-4 h-4 text-[#f27d26]" />
        <h2 className="text-xs font-bold text-[#8e9299] uppercase tracking-widest">
          Active Equipment Context Corpus [Grounding Layer]
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {manuals.map((man) => {
          const isActive = man.id === activeManualId;
          const iconMap = {
            HVAC: <Thermometer className="w-4 h-4 text-[#f27d26]" />,
            Pumping: <Droplet className="w-4 h-4 text-sky-400" />,
            Electrical: <Zap className="w-4 h-4 text-[#00ff41]" />,
          };

          return (
            <div
              id={`manual-card-${man.id}`}
              key={man.id}
              onClick={() => onSelectManual(man.id)}
              className={`border p-4 rounded-sm cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? "bg-[#151619] border-[#f27d26] shadow-[0_0_12px_rgba(242,125,38,0.15)]"
                  : "bg-[#151619] border-[#2a2a2c] hover:border-[#3a3a3c]"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="p-1.5 bg-black/40 rounded-sm">
                    {iconMap[man.category]}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                    isActive ? "bg-[#f27d26]/10 text-[#f27d26]" : "bg-black/40 text-[#8e9299]"
                  }`}>
                    {man.category}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white uppercase tracking-tighter">
                  {man.name}
                </h3>
                <span className="text-[10px] text-[#8e9299] block font-mono">
                  Model: {man.model}
                </span>

                {/* Short specs list */}
                <div className="mt-3 border-t border-[#2a2a2c] pt-3 flex flex-col gap-1.5">
                  {Object.entries(man.specs).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-[10px] font-mono leading-tight">
                      <span className="text-[#8e9299] text-ellipsis overflow-hidden whitespace-nowrap">{key}:</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show associated SOP procedures */}
              <div className="mt-4 pt-3 border-t border-[#2a2a2c] flex flex-col gap-2">
                <span className="text-[9px] font-bold text-[#f27d26] uppercase tracking-widest block">
                  Actionable SOPs
                </span>
                {man.sops.map((sop) => (
                  <button
                    id={`sop-trigger-${sop.id}`}
                    key={sop.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectManual(man.id);
                      onStartDiagnostics(man.id, sop.id);
                    }}
                    className="w-full text-left bg-black/40 border border-[#2a2a2c] hover:border-[#f27d26]/40 p-2 rounded-sm text-[10px] transition-all flex justify-between items-center group/btn"
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <FileText className="w-3 h-3 text-[#8e9299] group-hover/btn:text-[#f27d26]" />
                      <span className="text-[#8e9299] font-mono truncate max-w-[150px] group-hover/btn:text-white">
                        {sop.title}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#8e9299] group-hover/btn:text-[#f27d26] transition" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
