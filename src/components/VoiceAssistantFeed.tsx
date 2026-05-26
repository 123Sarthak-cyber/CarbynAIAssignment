import React, { useState, useEffect, useRef } from "react";
import { Message } from "../types";
import { Mic, MicOff, Send, MessageSquare, Volume2, Shield, Eye, Info, VolumeX, AlertCircle, Radio } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface VoiceAssistantFeedProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  statusMessage: string;
}

export default function VoiceAssistantFeed({
  messages,
  onSendMessage,
  isLoading,
  statusMessage,
}: VoiceAssistantFeedProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSynthesisMuted, setSpeechSynthesisMuted] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  // Speech Recognition API setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Auto Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Initializing Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          onSendMessage(transcript);
          setInputText("");
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error: ", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("Microphone blocked. Please grant browser camera/mic permissions, or type below!");
        } else {
          setRecognitionError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      console.warn("Speech recognition is not natively supported in this browser environment.");
    }
  }, [onSendMessage]);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition isn't natively supported in this browser container. Please type your voice command below to simulate hands-free speak!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        setRecognitionError(null);
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
        setIsListening(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  // Web Speech API Synthesis for TTS co-pilot speaker
  const speakText = (text: string) => {
    if (speechSynthesisMuted) return;
    
    // Cancel any ongoing speaking
    window.speechSynthesis.cancel();
    
    // Filter out some markdown characters for cleaner speech output
    const cleanText = text
      .replace(/[\*#_`\-]/g, " ")
      .replace(/https?:\/\/[^\s]+/g, "url link")
      .substring(0, 400); // Speaking length cap

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.volume = 1;
    utterance.rate = 1.05; // Slightly faster for industrial efficiency
    utterance.pitch = 1.0;
    
    // Choose a professional sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const systemVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.lang.startsWith("en"));
    if (systemVoice) {
      utterance.voice = systemVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Speak when a new assistant message arrives
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === "assistant") {
        speakText(lastMsg.text);
      }
    }
  }, [messages, speechSynthesisMuted]);

  return (
    <div id="voice-assistant-communicator" className="flex flex-col bg-[#151619] border border-[#2a2a2c] rounded-sm overflow-hidden font-mono shadow-xl aspect-[4/3] min-h-[460px]">
      {/* Feed Header */}
      <div className="bg-black/45 px-4 py-3 border-b border-[#2a2a2c] flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#f27d26]" />
          <span className="font-bold text-white uppercase tracking-widest text-[11px]">
            Holographic Dialogue Stream
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mute button */}
          <button
            id="toggle-mute"
            onClick={() => {
              setSpeechSynthesisMuted(!speechSynthesisMuted);
              window.speechSynthesis.cancel();
            }}
            className={`p-1 border rounded-sm transition text-xs flex items-center gap-1 cursor-pointer ${
              speechSynthesisMuted
                ? "bg-red-950/20 text-red-400 border-red-900/30"
                : "bg-black/50 text-[#f27d26] border-[#2a2a2c]"
            }`}
            title={speechSynthesisMuted ? "Unmute TTS Co-Pilot" : "Mute TTS Co-Pilot"}
          >
            {speechSynthesisMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="text-[9px] font-bold uppercase">{speechSynthesisMuted ? "MUTED" : "VOICE ENGINE"}</span>
          </button>
        </div>
      </div>

      {/* Messages Render list */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-black/40"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#8e9299]">
            <Mic className="w-10 h-10 mb-2 text-[#8e9299]/40" />
            <h4 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-widest mb-1">
              Smart-Glasses Sync STANDBY
            </h4>
            <p className="font-sans text-[11px] max-w-sm leading-normal">
              Tap the orange microphone or enter commands to inspect machines. Try asking: <br />
              <span className="text-[#f27d26] italic">"What symptoms do I look for?"</span> or <br />
              <span className="text-[#f27d26] italic">"Walk me through the refrigeration low pressure SOP."</span>
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div
                id={`dialogue-msg-${m.id}`}
                key={m.id}
                className={`max-w-[85%] rounded-sm p-3 text-xs leading-relaxed flex flex-col flex-start overflow-hidden ${
                  isUser
                    ? "bg-[#2a2a2c] text-[#e0e0e0] border border-[#3a3a3c] self-end"
                    : "bg-black/40 text-sky-200 border border-[#2a2a2c] self-start"
                }`}
              >
                {/* Meta details */}
                <span className="text-[9px] text-[#8e9299] font-bold uppercase mb-1 tracking-wider block">
                  {isUser ? "Technician (Voice Input)" : "Carbyn Co-Pilot HUD"} • {m.timestamp}
                </span>

                {/* If vision metadata is contained */}
                {m.visionTarget && m.visionTarget.identified && (
                  <div className="mb-2 p-2 bg-black/60 border border-[#f27d26]/30 rounded-sm text-[10px] text-[#f27d26] flex flex-col gap-1">
                    <span className="font-bold uppercase text-[8px] tracking-wider block text-[#f27d26]/80">
                      🔍 AR GLASSES LENS CLASSIFICATION:
                    </span>
                    <p className="font-bold">
                      Detected: {m.visionTarget.itemName} (Conf: {Math.round(m.visionTarget.confidence * 100)}%)
                    </p>
                    {m.visionTarget.detectedAnomalies.length > 0 && (
                      <p className="text-red-400 font-serif">
                        Anomalies Catch: {m.visionTarget.detectedAnomalies.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Response Markdown */}
                <div className="prose prose-invert prose-xs font-sans text-slate-100 max-w-full leading-normal">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>

                {/* Audio playback indicator */}
                {!isUser && (
                  <button
                    id={`speak-repeat-btn-${m.id}`}
                    onClick={() => speakText(m.text)}
                    className="mt-2 text-[9px] text-[#00ff41]/80 hover:text-[#00ff41] flex items-center gap-1 self-start font-bold uppercase transition focus:outline-none cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Repeat Audio Output
                  </button>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="bg-[#f27d26]/10 border border-[#f27d26]/30 text-[#f27d26] p-3 rounded-sm text-xs self-start max-w-[85%] flex items-center gap-2 animate-pulse">
            <Radio className="w-4 h-4 animate-spin text-[#f27d26]" />
            <span className="font-bold uppercase tracking-widest text-[9px]">
              Carbyn Processing Telemetry Data...
            </span>
          </div>
        )}
      </div>

      {/* Voice Warning alerts */}
      {recognitionError && (
        <div className="px-4 py-1.5 bg-red-950/30 border-t border-red-900/30 text-red-400 text-[10px] sm:text-xs flex items-center gap-1.5 leading-tight select-none">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{recognitionError}</span>
        </div>
      )}

      {/* Inputs controller dock */}
      <div className="p-3 bg-black/40 border-t border-[#2a2a2c] flex flex-col gap-2">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          {/* Micro hands-free trigger button */}
          <button
            id="mic-pulse-trigger"
            type="button"
            onClick={toggleVoiceListening}
            className={`p-2.5 rounded-sm border transition shrink-0 cursor-pointer ${
              isListening
                ? "bg-red-650 border-red-500 text-white animate-pulse"
                : "bg-[#f27d26]/10 hover:bg-[#f27d26]/20 border-[#f27d26]/30 text-[#f27d26]"
            }`}
            title={isListening ? "Listening... click to send" : "Tap to Speak Hands-Free"}
          >
            {isListening ? <Mic className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text entry field alternative */}
          <input
            id="copilot-input-field"
            type="text"
            className="flex-1 bg-black border border-[#2a2a2c] focus:border-[#f27d26]/80 rounded-sm px-3 py-2 text-xs text-white placeholder-[#8e9299]/50 focus:outline-none transition leading-tight font-sans"
            placeholder={isListening ? "Listening to your voice..." : "Hands occupied? Write text command here..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />

          <button
            id="btn-send-message"
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-[#f27d26] hover:bg-[#e06d1c] disabled:bg-[#151619] text-black disabled:text-[#8e9299]/40 font-bold px-3.5 py-2 rounded-sm text-xs transition flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="text-[10px] text-[#8e9299] font-sans flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#2a2a2c] shrink-0" />
          <span>{statusMessage}</span>
        </div>
      </div>
    </div>
  );
}
