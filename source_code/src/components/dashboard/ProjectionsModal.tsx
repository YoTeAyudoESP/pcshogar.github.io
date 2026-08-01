import React from 'react';
import ModalPortal from '../common/ModalPortal';
import ProjectionsView from '../analytics/ProjectionsView';
import { X } from 'lucide-react';

interface ProjectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProjectionsModal: React.FC<ProjectionsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="modal-overlay" onClick={onClose} style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                overflowY: 'auto'
            }}>
                <div 
                    onClick={e => e.stopPropagation()} 
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        background: '#13151f',
                        borderRadius: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        padding: '1rem'
                    }}
                >
                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1.25rem',
                            right: '1.25rem',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            cursor: 'pointer',
                            zIndex: 10
                        }}
                    >
                        <X size={20} />
                    </button>

                    <ProjectionsView />
                </div>
            </div>
        </ModalPortal>
    );
};

export default ProjectionsModal;
