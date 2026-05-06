import { useState } from 'react';
import { Mic, Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TaskRequest() {
  const [task, setTask] = useState('');
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTask(transcript);
    };

    recognition.start();
  };

  const submitTask = () => {
    if (!task.trim()) {
      alert("Please describe what help you need.");
      return;
    }

    alert(`✅ Task Submitted Successfully!\n\n"${task}"\n\nFinding nearby volunteers...`);
    // Later: Send to backend with Socket.io
    setTask('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 mb-8 hover:underline"
        >
          <ArrowLeft size={24} /> Back to Dashboard
        </button>

        <div className="senior-card">
          <h1 className="text-4xl font-bold mb-8">Request Help</h1>
          
          <p className="text-xl text-gray-600 mb-8">
            Tell us what you need help with. You can type or speak.
          </p>

          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Example: I need help reading my medicine prescription or I fell down and need assistance..."
            className="w-full h-48 resize-y border-2 border-gray-300 rounded-3xl p-6 text-lg"
          />

          <div className="flex gap-4 mt-8">
            <button
              onClick={startVoiceInput}
              className={`flex-1 btn-large flex items-center justify-center gap-3 ${isListening ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
            >
              <Mic size={32} />
              {isListening ? "Listening..." : "Speak Now"}
            </button>

            <button
              onClick={submitTask}
              className="flex-1 btn-large bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3"
            >
              <Send size={32} />
              Submit Request
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 mt-8 text-lg">
          Your request will be smart-matched with nearby verified volunteers.
        </p>
      </div>
    </div>
  );
}