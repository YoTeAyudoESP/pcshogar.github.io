import React, { useState } from 'react';
import { PiggyBank, ArrowLeftRight, Plus } from 'lucide-react';
import PiggyBankList from './PiggyBankList';
import PiggyBankForm from './PiggyBankForm';
import PiggyBankChart from './PiggyBankChart';
import PiggyBankTransferForm from './modals/PiggyBankTransferForm';
import PiggyBankAddMoneyForm from './modals/PiggyBankAddMoneyForm';
import PiggyBankHistoryModal from './modals/PiggyBankHistoryModal';
import { useFinance } from '../../contexts/FinanceContext';
import type { SavingGoal } from '../../types/finance';

const SavingsView: React.FC = () => {
    const { savings } = useFinance();
    const [showForm, setShowForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingGoal | undefined>(undefined);
    
    // Modals
    const [showTransfer, setShowTransfer] = useState(false);
    const [addMoneyGoal, setAddMoneyGoal] = useState<SavingGoal | undefined>(undefined);
    const [historyGoal, setHistoryGoal] = useState<SavingGoal | undefined>(undefined);

    React.useEffect(() => {
        const handleBack = (e: Event) => {
            if (e.defaultPrevented) return;

            if (showTransfer) {
                e.preventDefault();
                setShowTransfer(false);
            } else if (addMoneyGoal) {
                e.preventDefault();
                setAddMoneyGoal(undefined);
            } else if (historyGoal) {
                e.preventDefault();
                setHistoryGoal(undefined);
            }
        };

        window.addEventListener('app-back-pressed', handleBack);
        return () => window.removeEventListener('app-back-pressed', handleBack);
    }, [showTransfer, addMoneyGoal, historyGoal]);

    const handleEdit = (goal: SavingGoal) => {
        setEditingGoal(goal);
        setShowForm(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <PiggyBank size={48} style={{ color: '#f59e0b', filter: 'drop-shadow(0 2px 10px rgba(245, 158, 11, 0.4))' }} />
                </div>
                <button 
                    onClick={() => { setEditingGoal(undefined); setShowForm(true); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                    }}
                >
                    <Plus size={20} />
                    Añadir Hucha
                </button>
            </div>

            <PiggyBankChart />

            <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PiggyBank size={20} /> Mis Huchas
                    </h3>
                    {savings.length > 1 && (
                        <button 
                            onClick={() => setShowTransfer(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <ArrowLeftRight size={18} />
                            Traspasar
                        </button>
                    )}
                </div>

                <PiggyBankList 
                    onEdit={handleEdit} 
                    onAddMoney={setAddMoneyGoal}
                    onShowHistory={setHistoryGoal}
                />
            </div>

            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{ maxWidth: '500px', width: '100%', animation: 'scaleUp 0.3s ease' }}>
                        <PiggyBankForm 
                            editingGoal={editingGoal} 
                            onCancelEdit={() => setShowForm(false)}
                            onClose={() => setShowForm(false)}
                        />
                    </div>
                </div>
            )}

            {showTransfer && (
                <PiggyBankTransferForm 
                    onClose={() => setShowTransfer(false)}
                />
            )}

            {addMoneyGoal && (
                <PiggyBankAddMoneyForm 
                    goal={addMoneyGoal}
                    onClose={() => setAddMoneyGoal(undefined)}
                />
            )}

            {historyGoal && (
                <PiggyBankHistoryModal 
                    goal={historyGoal}
                    onClose={() => setHistoryGoal(undefined)}
                />
            )}
        </div>
    );
};

export default SavingsView;
