import React from 'react';
import { 
  Home, 
  Send, 
  Code, 
  ChevronRight, 
  Bell, 
  Activity, // For "waveform.path.ecg"
  LogOut, 
  User, 
  Mail, 
  Lock, 
  X 
} from 'lucide-react';

// This dictionary maps your Expo/Mobile icon names to Web icons
const MAPPING = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.right': ChevronRight,
  'bell.fill': Bell,
  'waveform.path.ecg': Activity, // The heart/ECG icon
  'rectangle.portrait.and.arrow.right': LogOut,
  'person.fill': User,
  'envelope': Mail,
  'lock': Lock,
  'xmark': X,
};

export function IconSymbol({ name, size = 24, color = "currentColor", style }) {
  const Icon = MAPPING[name] || Home; // Fallback to Home if name not found
  return <Icon size={size} color={color} style={style} />;
}