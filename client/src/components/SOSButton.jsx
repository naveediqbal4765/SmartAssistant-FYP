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
      onClick={triggerSOS}
      className="sos-button"
    >
      <AlertTriangle size={36} />
      EMERGENCY SOS
    </button>
  );
}