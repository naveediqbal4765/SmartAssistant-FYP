import { Activity, Award, Bell, Calendar, CheckCircle, Clipboard, FileText, Heart, Users } from 'lucide-react';

export const normalizeDashboardRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  return normalizedRole === 'elder' ? 'senior' : normalizedRole;
};

export const roleConfig = {
  senior: {
    roleLabel: 'Senior',
    greetingName: 'Dear Senior',
    greetingSubtitle: 'How can we help you today?',
    panels: ['callReminders', 'seniorReadiness'],
    summary: {
      title: 'Your Personal Safety Assistant',
      icon: '🛡️',
      description: 'You can request help, set medication reminders, detect falls, and stay connected with your family and community volunteers.'
    },
    modules: [
      { title: 'Task Requests', icon: Clipboard, tone: 'success', route: '/task-requests' },
      { title: 'Medications', icon: Bell, tone: 'warning', route: '/health/medications' },
      { title: 'Digital Health Vault', icon: FileText, tone: 'indigo', vaultTarget: 'self' },
      { title: 'Appointments', icon: Calendar, tone: 'teal', route: '/health/appointments' },
      { title: 'Drug Interaction Checker', icon: Heart, tone: 'danger', route: '/health/interactions' }
    ]
  },
  volunteer: {
    roleLabel: 'Volunteer',
    greetingName: 'Volunteer',
    greetingSubtitle: 'Ready to make a difference today?',
    panels: ['volunteerReadiness'],
    summary: {
      title: 'Thank you for being a Volunteer! ❤️',
      icon: '🤝',
      description: "You can view nearby help requests, earn rewards for helping seniors, and make a real difference in someone's life."
    },
    modules: [
      { title: 'Available Tasks', icon: Activity, tone: 'success', route: '/task-requests?view=available' },
      { title: 'My Tasks', icon: Clipboard, tone: 'info', route: '/task-requests?view=my' },
      { title: 'Completed Tasks', icon: CheckCircle, tone: 'highlight', route: '/task-requests?view=completed' },
      { title: 'My Rewards', icon: Award, tone: 'reward', route: '/task-requests?view=rewards' },
      { title: 'Help Seniors', icon: Users, tone: 'indigo', comingSoon: 'Help Seniors - Coming Soon' },
      { title: 'Impact Stats', icon: Activity, tone: 'teal', comingSoon: 'Impact Stats - Coming Soon' }
    ]
  },
  caregiver: {
    roleLabel: 'Caregiver',
    greetingName: 'Caregiver',
    greetingSubtitle: 'Monitor and care for your loved ones',
    panels: ['caregiverAlertCenter'],
    summary: {
      title: 'Caregiver Dashboard',
      icon: '🏥',
      description: "Monitor your loved one's health, location, and get instant alerts in case of emergency."
    },
    modules: [
      { title: 'Linked Senior', icon: Users, tone: 'highlight', relationshipTarget: 'linkedSenior' },
      { title: "Senior's Medications", icon: Bell, tone: 'info', route: '/health/medications' },
      { title: "Senior's Health Vault", icon: FileText, tone: 'teal', vaultTarget: 'linkedSenior' },
      { title: "Senior's Appointments", icon: Calendar, tone: 'highlight', route: '/health/appointments' },
      { title: "Senior's Task Requests", icon: Clipboard, tone: 'warning', route: '/task-requests' }
    ]
  }
};
