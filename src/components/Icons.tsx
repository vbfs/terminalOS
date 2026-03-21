import React from 'react'

type P = { size?: number; className?: string }

export const IconX: React.FC<P> = ({ size = 10, className }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className}>
    <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const IconMinus: React.FC<P> = ({ size = 10, className }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className}>
    <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const IconRestore: React.FC<P> = ({ size = 10, className }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className}>
    <polyline points="2,6 5,3 8,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IconPanelRight: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <rect x="1" y="1.5" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="7" y="1.5" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

export const IconPanelBottom: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <rect x="1" y="1" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1" y="7" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

export const IconMarkdownDoc: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <rect x="1.5" y="0.5" width="7.5" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="3.5" y1="3.5" x2="7.5" y2="3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="3.5" y1="5.5" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="3.5" y1="7.5" x2="6" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

export const IconArrowUp: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <line x1="6" y1="10" x2="6" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <polyline points="3,5 6,2 9,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IconArrowLeft: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <line x1="10" y1="6" x2="2" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <polyline points="5,3 2,6 5,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IconPlus: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const IconSend: React.FC<P> = ({ size = 13, className }) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none" className={className}>
    <line x1="6.5" y1="11" x2="6.5" y2="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <polyline points="3,5.5 6.5,2 10,5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IconChevronDown: React.FC<P> = ({ size = 10, className }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className}>
    <polyline points="2,3.5 5,6.5 8,3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IconFolder: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M1 4C1 3.45 1.45 3 2 3H4.5L5.5 4.5H10C10.55 4.5 11 4.95 11 5.5V9.5C11 10.05 10.55 10.5 10 10.5H2C1.45 10.5 1 10.05 1 9.5V4Z" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

export const IconFile: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M3 1H7L10 4V11C10 11.55 9.55 12 9 12H3C2.45 12 2 11.55 2 11V2C2 1.45 2.45 1 3 1Z" stroke="currentColor" strokeWidth="1.2" />
    <polyline points="7,1 7,4 10,4" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

export const IconFilePlus: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M2.5 1H6.5L9.5 4V10C9.5 10.55 9.05 11 8.5 11H2.5C1.95 11 1.5 10.55 1.5 10V2C1.5 1.45 1.95 1 2.5 1Z" stroke="currentColor" strokeWidth="1.2" />
    <polyline points="6.5,1 6.5,4 9.5,4" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5" y1="6.5" x2="5" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="3.5" y1="8" x2="6.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

export const IconFolderPlus: React.FC<P> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M1 4C1 3.45 1.45 3 2 3H4L5 4.5H9C9.55 4.5 10 4.95 10 5.5V8.5C10 9.05 9.55 9.5 9 9.5H2C1.45 9.5 1 9.05 1 8.5V4Z" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5.5" y1="5.5" x2="5.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)
