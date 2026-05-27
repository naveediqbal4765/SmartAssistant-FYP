import { Activity, Award, Bell, Calendar, Clipboard, FileText, Heart, MessageCircle, User, Users } from 'lucide-react';

export const normalizeDashboardRole = (role) => (role === 'elder' ? 'senior' : role);

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
      { title: 'Request Help', icon: Heart, tone: 'success', route: '/request-help' },
      { title: 'My Profile', icon: User, tone: 'info', route: '/profile' },
      { title: 'My Requests', icon: Clipboard, tone: 'highlight', route: '/my-requests' },
      { title: 'Medications', icon: Bell, tone: 'warning', route: '/health/medications' },
      { title: 'Digital Health Vault', icon: FileText, tone: 'indigo', vaultTarget: 'self' },
      { title: 'Chat', icon: MessageCircle, tone: 'brand', route: '/chat' },
      { title: 'Groups', icon: Users, tone: 'cyan', route: '/groups' },
      { title: 'Appointments', icon: Calendar, tone: 'teal', route: '/health/appointments' },
      { title: 'Health Telemetry', icon: Activity, tone: 'lime', route: '/health/telemetry' },
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
      { title: 'Available Tasks', icon: Activity, tone: 'success', comingSoon: 'Available Tasks - Coming Soon' },
      { title: 'My Tasks', icon: Clipboard, tone: 'info', comingSoon: 'My Tasks - Coming Soon' },
      { title: 'My Profile', icon: User, tone: 'highlight', route: '/profile' },
      { title: 'My Rewards', icon: Award, tone: 'reward', comingSoon: 'My Rewards - Coming Soon' },
      { title: 'Help Seniors', icon: Users, tone: 'indigo', comingSoon: 'Help Seniors - Coming Soon' },
      { title: 'Impact Stats', icon: Activity, tone: 'teal', comingSoon: 'Impact Stats - Coming Soon' },
      { title: 'Chat', icon: MessageCircle, tone: 'brand', route: '/chat' },
      { title: 'Groups', icon: Users, tone: 'cyan', route: '/groups' }
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
      { title: "Senior's Health Telemetry", icon: Activity, tone: 'lime', route: '/health/telemetry' },
      { title: "Senior's Requests", icon: Clipboard, tone: 'warning', route: '/my-requests' },
      { title: 'My Profile', icon: User, tone: 'indigo', route: '/profile' }
    ]
  }
};
