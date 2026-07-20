import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * ModalPortal: Renders children directly into document.body,
 * bypassing any CSS transform / backdrop-filter on ancestor elements
 * that would otherwise break position:fixed behaviour.
 */
const ModalPortal = ({ children }: { children: ReactNode }) => {
  return createPortal(<>{children}</>, document.body);
};

export default ModalPortal;
