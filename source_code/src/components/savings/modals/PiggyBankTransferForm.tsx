import React, { useState } from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import { formatMoney } from '../../../utils/financeCalculations';

interface PiggyBankTransferFormProps {
    onClose: () => void;
}

const PiggyBankTransferForm: React.FC<PiggyBankTransferFormProps> = ({ onClose }) => {
    const { savings, transferSavings } = useFinance();
    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!fromId || !toId || !amount) {
            setError('Completa todos los campos');
            return;
        }

        if (fromId === toId) {
            setError('Origen y destino deben ser distintos');
            return;
        }

        const transAmount = parseFloat(amount);
        const fromGoal = savings.find(s => s.id === fromId);

        if (!fromGoal || fromGoal.currentAmount < transAmount) {
            setError('Fondos insuficientes en la hucha de origen');
            return;
        }

        try {
            await transferSavings(fromId, toId, transAmount);
            onClose();
        } catch (err) {
            setError('Error en la transferencia');
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.75rem',
        color: 'white',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
        }}>
            <form onSubmit={handleSubmit} className="glass-panel" style={{ 
                maxWidth: '450px', width: '100%', padding: '2rem', borderRadius: '1.5rem',
                background: 'rgba(30, 32, 47, 0.98)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                animation: 'scaleUp 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', color: '#ec4899' }}>
                        <ArrowRightLeft size={24} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Traspasar Fondos</h3>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Hucha de Origen</label>
                        <select style={inputStyle} value={fromId} onChange={e => setFromId(e.target.value)} required>
                            <option value="">Seleccionar hucha...</option>
                            {savings.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.currentAmount)})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Hucha de Destino</label>
                        <select style={inputStyle} value={toId} onChange={e => setToId(e.target.value)} required>
                            <option value="">Seleccionar destino...</option>
                            {savings.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Importe a Traspasar (€)</label>
                        <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                    </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1rem', borderRadius: '12px', marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    ℹ️ Esta operación <strong>no afecta</strong> al disponible mensual configurado para el mes en curso.
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" onClick={onClose} style={{
                        flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600
                    }}>Cancelar</button>
                    <button type="submit" style={{
                        flex: 1.5,
                        padding: '1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                        color: 'white',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}>
                        Realizar Traspaso
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PiggyBankTransferForm;
