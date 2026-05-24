import { AlertTriangle } from 'lucide-react';

export default function SOSButton() {
  const triggerSOS = () => {
    if (window.confirm("🚨 Are you sure you want to send SOS? This will alert your emergency contacts and nearby volunteers.")) {
      alert("🚨 SOS ACTIVATED!\n\nEmergency contacts and nearby volunteers have been notified.\nHelp is on the way!");
      
      // Later we will connect this with Socket.io + backend
      console.log("SOS Triggered - Emergency system activated");
    }
  };

  return (
    <button
      type="button"
      onClick={triggerSOS}
      aria-label="Send SOS alert"
      className="fixed bottom-6 right-6 z-40 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-red-600 to-rose-700 text-white shadow-xl shadow-red-900/25 ring-2 ring-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-red-900/30 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
    >
      <AlertTriangle size={20} strokeWidth={2.5} />
      <span className="text-sm font-black leading-none tracking-wide">SOS</span>
    </button>
  );
}