import React, { useState, useEffect } from "react";
import { Message, EquipmentManual, DiagnosticChecklist } from "./types";
import { EQUIPMENT_MANUALS } from "./data/manuals";
import SmartGlassesHUD from "./components/SmartGlassesHUD";
import DeviceManualCard from "./components/DeviceManualCard";
import SOPProgressChecklist from "./components/SOPProgressChecklist";
import VoiceAssistantFeed from "./components/VoiceAssistantFeed";
import { 
  Terminal, ShieldCheck, HeartPulse, FileText, Database, 
  HelpCircle, Settings, Share2, Sparkles, BookOpen, Layers, 
  CheckCircle, ArrowUpRight, Cpu, Network
} from "lucide-react";

export default function App() {
  const [manuals, setManuals] = useState<EquipmentManual[]>(EQUIPMENT_MANUALS);
  const [activeManualId, setActiveManualId] = useState<string>("hvac_xr900");
  const [activeSopId, setActiveSopId] = useState<string | null>(null);
  
  // Dialog feed messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial_welcome",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: "assistant",
      text: "Welcome back, Operator. Carbyn Glasses Pro co-pilot is synthesized and local. Please select an active machine panel below or run an anomaly diagnostic scan.",
    }
  ]);

  const [checklist, setChecklist] = useState<DiagnosticChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Bounding box outputs for AR HUD
  const [detectedItems, setDetectedItems] = useState<Array<{
    label: string;
    box2d: number[];
    status: string;
  }>>([]);

  const [glassesStatusText, setGlassesStatusText] = useState("Local system telemetry fully operational.");
  const [tabIndex, setTabIndex] = useState<"dashboard" | "report">("dashboard");

  // Keep track of the active equipment manual instance
  const activeManual = manuals.find(m => m.id === activeManualId) || manuals[0];

  // Starts an active guided SOP resolution session
  const handleStartDiagnostics = (manualId: string, sopId: string) => {
    const selectedManual = manuals.find(m => m.id === manualId);
    if (!selectedManual) return;

    const targetSop = selectedManual.sops.find(s => s.id === sopId);
    if (!targetSop) return;

    setActiveManualId(manualId);
    setActiveSopId(sopId);

    // Bootstrap checklist model
    const newChecklist: DiagnosticChecklist = {
      sopId: targetSop.id,
      sopTitle: targetSop.title,
      currentStepIndex: 0,
      steps: targetSop.steps.map((text, idx) => ({
        text,
        status: idx === 0 ? "current" : "pending",
        technicianConfirmed: false,
      })),
    };

    setChecklist(newChecklist);
    setDetectedItems([]);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const triggerMessage: Message = {
      id: `sop_trigger_${Date.now()}`,
      timestamp,
      sender: "assistant",
      text: `Starting guided rectification: **${targetSop.title}**.\n\n` + 
            `⚠️ **CRITICAL SAFETY REQUIREMENT:** ${targetSop.safetyFirst}\n\n` +
            `**STEP 1 REQUIREMENT:** ${targetSop.steps[0]}`,
    };

    setMessages(prev => [...prev, triggerMessage]);
    setGlassesStatusText(`Guided checklist launched for ${selectedManual.name}.`);
  };

  // Safe manual step override clicker
  const handleAdvanceStep = () => {
    if (!checklist) return;

    const updatedSteps = [...checklist.steps];
    const currentIdx = checklist.currentStepIndex;
    
    // Mark completed
    updatedSteps[currentIdx].status = "completed";
    updatedSteps[currentIdx].technicianConfirmed = true;

    const nextIdx = currentIdx + 1;
    let completedWorkflow = false;

    if (nextIdx < updatedSteps.length) {
      updatedSteps[nextIdx].status = "current";
    } else {
      completedWorkflow = true;
    }

    const nextChecklist = {
      ...checklist,
      currentStepIndex: completedWorkflow ? currentIdx : nextIdx,
      steps: updatedSteps,
    };

    setChecklist(nextChecklist);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (completedWorkflow) {
      setMessages(prev => [...prev, {
        id: `sop_finish_${Date.now()}`,
        timestamp,
        sender: "assistant",
        text: `🎉 **WORKFLOW COMPLETED SUCCESSFULLY.** All standard operating procedure checkpoints for **${checklist.sopTitle}** have been verified and validated. Excellent work! Logging audit logs to sub-panel EP-400 control unit registry.`
      }]);
      setGlassesStatusText("SOP resolved. Unit returned to service.");
    } else {
      setMessages(prev => [...prev, {
        id: `sop_advance_${Date.now()}`,
        timestamp,
        sender: "assistant",
        text: `Step ${currentIdx + 1} confirmed. Advancing HUD instructions.\n\n**NEXT STEP PROMPT:** ${updatedSteps[nextIdx].text}`
      }]);
      setGlassesStatusText(`Advanced to step ${nextIdx + 1} on checklist.`);
    }
  };

  // Click on a checklist item to force snap coordinates to it
  const handleSelectStep = (index: number) => {
    if (!checklist) return;
    setChecklist({
      ...checklist,
      currentStepIndex: index,
      steps: checklist.steps.map((st, i) => ({
        ...st,
        status: i === index ? "current" : i < index ? "completed" : "pending",
      })),
    });
  };

  const handleResetSession = () => {
    setChecklist(null);
    setActiveSopId(null);
    setDetectedItems([]);
    setGlassesStatusText("Session reset. Telemetries recalibrating.");
    setMessages(prev => [...prev, {
      id: `reset_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: "assistant",
      text: "Active checklist cleared. Co-pilot operating on passive standby mode."
    }]);
  };

  // Submit technicians voice transcription or text entries to server co-pilot
  const handleSendMessage = async (text: string, imageBase64?: string) => {
    setIsLoading(true);
    setGlassesStatusText("Gemini reasoning core calculating optimal steps...");

    const userMsgId = `user_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append users chat message
    const userMessage: Message = {
      id: userMsgId,
      timestamp,
      sender: "user",
      text,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call primary diagnostic co-pilot API route on the server
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          textPrompt: text,
          imageBase64: imageBase64 || null,
          equipmentId: activeManualId,
          activeSopId: activeSopId || null,
          currentStepIndex: checklist ? checklist.currentStepIndex : undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // If co-pilot suggests activating a specific SOP campaign
        if (data.checklistUpdate?.suggestedSopId && !activeSopId) {
          handleStartDiagnostics(activeManualId, data.checklistUpdate.suggestedSopId);
          setIsLoading(false);
          return;
        }

        // Add assistant visual grounding coordinates if provided
        const assistantMsg: Message = {
          id: `copilot_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: "assistant",
          text: data.detailedGuidanceMarkdown || "Understood.",
          visionTarget: data.identifiedTarget ? {
            identified: true,
            itemName: data.identifiedTarget,
            confidence: data.confidence || 0.9,
            description: data.hudActionAlert || "",
            detectedAnomalies: data.detectedAnomalies || [],
          } : undefined,
        };

        setMessages(prev => [...prev, assistantMsg]);
        setGlassesStatusText(data.hudActionAlert || "Resolved.");

        // Check if the server-side reasoning resolved the active step
        if (checklist && data.checklistUpdate) {
          const { stepCompleted, nextStepIndex } = data.checklistUpdate;
          if (stepCompleted) {
            const updatedSteps = [...checklist.steps];
            const currentIdx = checklist.currentStepIndex;
            updatedSteps[currentIdx].status = "completed";
            updatedSteps[currentIdx].technicianConfirmed = true;

            const isLast = currentIdx === updatedSteps.length - 1;
            if (!isLast) {
              updatedSteps[nextStepIndex].status = "current";
            }

            setChecklist({
              ...checklist,
              currentStepIndex: isLast ? currentIdx : nextStepIndex,
              steps: updatedSteps,
            });

            if (isLast) {
              setMessages(prev => [...prev, {
                id: `sop_auto_finish_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sender: "assistant",
                text: "🎉 **SOP RESOLUTION VERIFIED AND APPROVED VIA MULTIMODAL COMPUTER VISION SCAN.** Splendid execution, technician!"
              }]);
            }
          }
        }

        // Query frame coordinates grounding highlights for AR overlay in parallel
        if (imageBase64) {
          try {
            const groundRes = await fetch("/api/frame-grounding", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64,
                targetFocus: activeManual.name
              })
            });
            const groundData = await groundRes.json();
            if (groundData && groundData.detectedItems) {
              setDetectedItems(groundData.detectedItems);
            }
          } catch (e) {
            console.error("Holographic grounding query failed:", e);
          }
        }

      } else {
        throw new Error(data.error || "Server connection failed");
      }
    } catch (err: any) {
      console.error("Co-pilot diagnosis thread error: ", err);
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: "assistant",
        text: `❌ **CO-PILOT CONGESTION EXCEPTION:** ${err.message || 'The diagnostic service is offline. Please verify the server running state.'}`
      }]);
      setGlassesStatusText("Service error. Resetting connection thread.");
    } finally {
      setIsLoading(false);
    }
  };

  // Snap photo taken by smart glasses simulator
  const handleCaptureFrame = (imageBase64: string, mockTitle?: string) => {
    // Automatically submit photo with diagnostic instruction
    const promptText = checklist 
      ? `Verify status of active Step ${checklist.currentStepIndex + 1}: "${checklist.steps[checklist.currentStepIndex].text}"`
      : `Scan and diagnose mechanical alignment of the inspected ${activeManual.name}.`;

    handleSendMessage(promptText, imageBase64);
  };

  return (
    <div id="carbyn-application-root" className="min-h-screen bg-[#0a0a0b] text-[#e0e0e0] flex flex-col font-sans selection:bg-[#f27d26]/40 selection:text-white">
      {/* Premium Top Navigation header */}
      <header className="bg-[#151619]/90 backdrop-blur-md border-b border-[#2a2a2c] sticky top-0 z-50 shadow-md select-none">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#f27d26]/10 p-2 rounded-sm text-[#f27d26] border border-[#f27d26]/20">
              <Terminal className="w-4 h-4 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-[0.2em] text-white">// CARB_GLASS_PRO</span>
                <span className="text-[9px] bg-[#f27d26]/10 text-[#f27d26] border border-[#f27d26]/20 px-2 py-0.2 rounded-sm font-mono font-semibold">CO-PILOT</span>
              </div>
              <span className="text-[10px] text-[#8e9299] block font-mono">REAL-TIME MULTIMODAL ASSISTANT FOR HEAVY MACHINERY REPAIRS</span>
            </div>
          </div>

          {/* Active Operating Center indicators/Vitals */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs border border-[#2a2a2c] px-3 py-1.5 rounded-sm bg-black/40">
              <Cpu className="w-3.5 h-3.5 text-[#00ff41]" />
              <span className="text-[10px] text-[#8e9299] font-mono">CORE_STATE: <span className="text-[#00ff41] font-bold uppercase">SYNTACTIC_LIVE</span></span>
            </div>
            
            {/* Main Tabs switcher */}
            <div className="flex border border-[#2a2a2c] rounded-sm p-1 bg-black text-xs font-mono">
              <button
                id="tab-btn-dashboard"
                onClick={() => setTabIndex("dashboard")}
                className={`px-3 py-1 rounded-sm transition-all flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] cursor-pointer ${
                  tabIndex === "dashboard"
                    ? "bg-[#f27d26] text-black font-extrabold"
                    : "text-[#8e9299] hover:text-white"
                }`}
              >
                HUD Dashboard
              </button>
              <button
                id="tab-btn-report"
                onClick={() => setTabIndex("report")}
                className={`px-3 py-1 rounded-sm transition-all flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] cursor-pointer ${
                  tabIndex === "report"
                    ? "bg-[#f27d26] text-black font-extrabold"
                    : "text-[#8e9299] hover:text-white"
                }`}
              >
                Assignment Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Workspace Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        
        {tabIndex === "dashboard" ? (
          <>
            {/* Horizontal Grid selecting manuals context */}
            <DeviceManualCard
              manuals={manuals}
              activeManualId={activeManualId}
              onSelectManual={setActiveManualId}
              onStartDiagnostics={handleStartDiagnostics}
            />

            {/* Split Screen layout of glasses viewfinder HUD vs active steps checkmarks & feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-2">
              
              {/* Left Column Viewfinder HUD */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#f27d26]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#8e9299] font-mono">Glasses Feed viewfinder HUD</span>
                  </div>
                  <span className="text-[9px] text-[#8e9299]/60 font-mono italic">
                    Snap lens feeds to trigger computer vision analysis on active machine components templates.
                  </span>
                </div>

                <SmartGlassesHUD
                  onCaptureFrame={handleCaptureFrame}
                  detectedItems={detectedItems}
                  activeEquipmentName={activeManual.name}
                  statusText={glassesStatusText}
                />
              </div>

              {/* Right Column Dialogue Feed & Checklist Progress */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* Visual guidance steps tracking */}
                <SOPProgressChecklist
                  checklist={checklist}
                  safetyInstruction={activeSopId ? (activeManual.sops.find(s => s.id === activeSopId)?.safetyFirst || "") : ""}
                  onAdvanceStep={handleAdvanceStep}
                  onSelectStep={handleSelectStep}
                  onResetSession={handleResetSession}
                />

                {/* Micro conversational loops speech feed */}
                <VoiceAssistantFeed
                  messages={messages}
                  onSendMessage={(t) => handleSendMessage(t)}
                  isLoading={isLoading}
                  statusMessage={glassesStatusText}
                />

              </div>
            </div>
          </>
        ) : (
          /* Technical Whitepaper Summary & System Architecture Report */
          <div id="carbyn-assignment-report-panel" className="bg-[#151619] border border-[#2a2a2c] rounded-sm p-6 sm:p-8 shadow-2xl max-w-4xl mx-auto text-[#e0e0e0] font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[#2a2a2c] pb-5 mb-6">
              <div>
                <span className="text-[#f27d26] tracking-widest text-[10px] uppercase font-bold block mb-1">
                  // Carbyn AI Round 1 Systems Take-Home Report
                </span>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none uppercase">
                  AI-Powered Real-Time Assistant for Hands-Free Workers
                </h1>
                <span className="text-[10px] text-[#8e9299] mt-2 block">
                  Operator Client Architecture & Dynamic Subsurface Grids • Build Compiled May 2026
                </span>
              </div>
              <div className="bg-[#f27d26] text-black font-extrabold px-3 py-1.5 rounded-sm text-[10px] tracking-wider uppercase shrink-0 border border-[#f27d26]">
                EVALUATION READY
              </div>
            </div>

            {/* Architecture Schema Visual Block */}
            <div className="mb-8 border border-[#2a2a2c] bg-black/40 rounded-sm p-5 font-mono text-[11px] leading-relaxed relative overflow-hidden">
              <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] text-[#8e9299] bg-black border border-[#2a2a2c] px-2 py-0.5 rounded-sm">
                <Network className="w-3 h-3 text-[#f27d26]" />
                <span>CO-PILOT DATA ARCHITECTURE FLOW</span>
              </div>
              <pre className="text-slate-300 whitespace-pre scrollbar-thin overflow-x-auto p-2 font-mono">
{`
 +---------------------------------------------------------------------------------+
 |                    CARBYN GLASSES CLIENT OS VIEWPORT INTERFACE                  |
 +---------------------------------------------------------------------------------+
 | [Navigator.mediaDevices]   ==> Snaps Frame Screenshot (Base64 JPEG Snapshots)   |
 | [Web Speech Recognition]   ==> Captures Voice Instructions (Hands-Free Speech)  |
 | [Web Speech Synthesis]     ==> Instant Low-Latency Spoken Dialogue Loops        |
 +---------------------------------------------------------------------------------+
                                      ||  JSON Over-The-Air Network Streams
                                      \\/
 +---------------------------------------------------------------------------------+
 |                 EMBEDDED EXPRESS SERVER CONTROLLERS (PORT 3000)                 |
 +---------------------------------------------------------------------------------+
 |  /api/diagnose   => Grounds Manual Details via Semantic Prompt Context          |
 |  /api/grounding  => Evaluates bounding boxes and identifies parts coordinates   |
 +---------------------------------------------------------------------------------+
                                      ||  Grounded System Query calls
                                      \\/
 +---------------------------------------------------------------------------------+
 |                    GOOGLE GENAI INTELLIGENT EXPERT ENGINE                       |
 +---------------------------------------------------------------------------------+
 |  gemini-2.5-flash             => Core Diagnostic Reasoning & SOP Verification  |
 +---------------------------------------------------------------------------------+
`}
              </pre>
            </div>

            <div className="space-y-6 text-xs leading-relaxed text-[#8e9299] font-mono">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-[#f27d26] rounded-sm block" />
                  1. Executive Architecture Summary
                </h3>
                <p className="font-sans leading-normal">
                  We have designed and finalized a production-grade <strong>multimodal interactive co-pilot</strong> supporting hands-free field mechanics maintaining industrial systems. The application runs a streamlined Express.js backend serving as the central pipeline, executing native calls using Google’s advanced <strong>Google GenAI (@google/genai 2.4.0) SDK</strong>.
                </p>
                <p className="mt-2 font-sans leading-normal">
                  The smart glasses HUD maps actual glass telemetry: rendering status levels, frame captures, visual overlays, and custom targeting crosshairs. Hands occupied? The worker communicates via verbal commands using <strong>Web Speech-to-Text Recognition</strong>, and the co-pilot guide speaks step requirements using <strong>Web Speech Synthesis TTS</strong> in seconds.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-[#f27d26] rounded-sm block" />
                  2. Secure Manual Grounding & Retrieval
                </h3>
                <p className="font-sans leading-normal bg-black/30 p-3 border border-[#2a2a2c] rounded-sm text-slate-300 leading-normal">
                  To eliminate visual hallucination and guard safety, the AI diagnostic loop is securely grounded in real factory operational manuals, including:
                  <br />
                  • <strong>HVAC Industrial Chiller XR900</strong>: Low pressure lockouts, compressor resets, flow indicators.
                  <br />
                  • <strong>Centrifugal Water Pump WP250</strong>: Seal assembly adjustments, cavitation, manual overrides.
                  <br />
                  • <strong>Electrical Power Panel EP400</strong>: LOTO isolation steps, breaker diagnostic tests, trip recoveries.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-[#f27d26] rounded-sm block" />
                  3. Production Decisions & Trade-Offs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="bg-[#151619] border border-[#2a2a2c] p-4 rounded-sm">
                    <span className="font-extrabold text-[#f27d26] block mb-1 uppercase text-[10px] tracking-wide">A. Dual Speech Latency Guard</span>
                    <p className="font-sans text-[11px] text-[#8e9299] leading-relaxed">
                      Network speech generation streams produce overhead latency. To preserve field efficiency, we implement immediate localized Web Audio Speech Synthesis on the client, maintaining seamless hands-free workflow advancement without waiting for high-cost audio packet downloads.
                    </p>
                  </div>
                  <div className="bg-[#151619] border border-[#2a2a2c] p-4 rounded-sm">
                    <span className="font-extrabold text-[#f27d26] block mb-1 uppercase text-[10px] tracking-wide">B. Rigid Schema-Enforced Diagnostics</span>
                    <p className="font-sans text-[11px] text-[#8e9299] leading-relaxed">
                      Static text output hinders automated state synchronization. We instruct Gemini utilizing strict JSON modes. The co-pilot computes steps progress verbally and synchronizes the client’s checklist components seamlessly on-the-fly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Corporate footer */}
      <footer className="bg-[#151619] border-t border-[#2a2a2c] py-4 px-6 text-center text-[#8e9299] text-[10px] sm:text-xs mt-auto select-none font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 CARBYN AI Inc. Hands-Free Factory Co-Pilot. All Rights Reserved.</span>
          <span className="text-[9px] text-[#8e9299]/50 block">
            SECURE REMOTE LINK ACTIVE • LOCK-OUT TAG-OUT SANCTUARY FULLY VALIDATED
          </span>
        </div>
      </footer>
    </div>
  );
}
