/**
 * Shared UI Components Barrel Export
 * Requirements: 3.1 (Component sharing)
 */

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './Card';

export { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from './Modal';
export type {
  ModalProps,
  ModalSize,
  ModalHeaderProps,
  ModalTitleProps,
  ModalContentProps,
  ModalFooterProps,
} from './Modal';

export { Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { Toast } from './Toast';
export type { ToastProps, ToastType, ToastAction } from './Toast';

export { ProfileBadge } from './ProfileBadge';
export type { ProfileBadgeProps, ProfileName } from './ProfileBadge';

export { AgentIcon, AgentBranchIcon, AGENT_ICON_COLOR } from './AgentIcon';
export type { AgentIconProps, AgentBranchIconProps } from './AgentIcon';

export { ResizeHandle } from './ResizeHandle';
