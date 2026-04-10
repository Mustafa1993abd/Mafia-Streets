import { Shield, ShieldAlert, Globe, Landmark, Target, Zap, Users, Lock } from 'lucide-react';

export const ministerialRoles = [
  { id: 'interior', label: 'وزير الداخلية', icon: Shield },
  { id: 'defense', label: 'وزير الدفاع', icon: ShieldAlert },
  { id: 'foreign', label: 'وزير الخارجية', icon: Globe },
  { id: 'finance', label: 'وزير المالية', icon: Landmark },
  { id: 'health', label: 'وزير الصحة', icon: Target },
  { id: 'industry', label: 'وزير الصناعة', icon: Target },
  { id: 'oil', label: 'وزير النفط', icon: Target },
  { id: 'electricity', label: 'وزير الكهرباء', icon: Zap },
  { id: 'labor', label: 'وزير العمل', icon: Users },
  { id: 'intelligence', label: 'رئيس المخابرات', icon: Target },
  { id: 'security', label: 'رئيس الأمن', icon: Lock },
];
