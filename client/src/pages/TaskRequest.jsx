import { useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import FeatureCard from '../components/ui/FeatureCard';
import FeaturePage from '../components/ui/FeaturePage';

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
    <FeaturePage
      title="Request Help"
      description="Tell us what you need help with. You can type or speak."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-2xl"
    >
        <FeatureCard>

          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Example: I need help reading my medicine prescription or I fell down and need assistance..."
            className="w-full h-48 resize-y rounded-xl border border-gray-300 p-6 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <div className="flex gap-4 mt-8">
            <Button
              onClick={startVoiceInput}
              variant={isListening ? 'danger' : 'primary'}
              size="lg"
              className="flex-1"
            >
              <Mic size={32} />
              {isListening ? "Listening..." : "Speak Now"}
            </Button>

            <Button
              onClick={submitTask}
              size="lg"
              className="flex-1"
            >
              <Send size={32} />
              Submit Request
            </Button>
          </div>
        </FeatureCard>

        <p className="text-center text-gray-500 mt-8 text-lg">
          Your request will be smart-matched with nearby verified volunteers.
        </p>
    </FeaturePage>
  );
}