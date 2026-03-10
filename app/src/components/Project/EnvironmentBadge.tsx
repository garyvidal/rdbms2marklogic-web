import React from 'react';
import {
  FaServer,
  FaCode,
  FaFlask,
  FaBug,
  FaSyncAlt,
} from 'react-icons/fa';
import type { ConnectionEnvironment } from '@/services/SchemaService';
import { ENVIRONMENT_LABELS } from '@/services/SchemaService';

interface EnvConfig {
  icon: React.ReactElement;
  color: string;
  bg: string;
}

const ENV_CONFIG: Record<Exclude<ConnectionEnvironment, 'None'>, EnvConfig> = {
  Production: {
    icon: <FaServer size={10} />,
    color: 'text-red-400',
    bg: 'bg-red-900/40 border-red-700/50',
  },
  Development: {
    icon: <FaCode size={10} />,
    color: 'text-blue-400',
    bg: 'bg-blue-900/40 border-blue-700/50',
  },
  Staging: {
    icon: <FaFlask size={10} />,
    color: 'text-orange-400',
    bg: 'bg-orange-900/40 border-orange-700/50',
  },
  QA_UAT: {
    icon: <FaBug size={10} />,
    color: 'text-purple-400',
    bg: 'bg-purple-900/40 border-purple-700/50',
  },
  ContinuousIntegration: {
    icon: <FaSyncAlt size={10} />,
    color: 'text-amber-400',
    bg: 'bg-amber-900/40 border-amber-700/50',
  },
};

interface EnvironmentBadgeProps {
  environment?: ConnectionEnvironment;
}

const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ environment }) => {
  if (!environment || environment === 'None') return null;

  const config = ENV_CONFIG[environment];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium ${config.color} ${config.bg}`}
    >
      {config.icon}
      {ENVIRONMENT_LABELS[environment]}
    </span>
  );
};

export default EnvironmentBadge;
