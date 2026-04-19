import React from 'react';
import * as Icons from 'lucide-react';

export default function DynamicIcon({ name, size = 20, ...props }) {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    return <Icons.HelpCircle size={size} {...props} />;
  }
  return <IconComponent size={size} {...props} />;
}
